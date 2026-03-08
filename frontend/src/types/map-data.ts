//-- design_data と GeoJSON の橋渡し用型定義
import type { Feature, FeatureCollection, LineString, Point } from "geojson"

/**
 * design_data.routes の各要素の形式（手順 9-1 で決定）
 *
 * signage の design_data は routes を RouteItem[] で持つ。
 * 各要素は次の形式:
 *   { id: string, type: string, coordinates: [[lng, lat], ...], width?: number, color?: string }
 *
 * - id: UUID（一意識別子）
 * - type: value_code（例: ROAD_CLOSED, DETOUR）。ルート描画ドロップダウンで選択した html_object_value の value_code
 * - coordinates: 経路の座標配列 [[lng, lat], [lng, lat], ...]
 * - width: 線の太さ（オプション、Phase 6 で線種対応時に使用）
 * - color: 線の色（オプション、Phase 6 で線種対応時に使用）
 *
 * ※ GeoJSON Feature 形式（geometry.type: "LineString"）は内部・読込時に使用するが、
 *   API 送信・JSON 出力時は RouteItem[] 形式に統一する。
 */
export interface RouteItem {
  id: string
  /** value_code（例: SOLID_RED_W4, STRIPE_BLUE_W4） */
  type: string
  /** 経路の座標 [[lng, lat], [lng, lat], ...] */
  coordinates: [number, number][]
  width?: number
  color?: string
  /** 縞線: true のとき選択色と白を交互に表示 */
  stripe?: boolean
}

/** design_data.routes の型。RouteItem[] に統一 */
export type DesignDataRoutes = RouteItem[]

//-- 地図データのJSON形式（枝番ごとのルート・テキスト・画像・吹き出し等）
export interface MapDataJson {
  version: number
  branchNo?: string
  orderNo?: string
  routes?: RouteItem[] | FeatureCollection<LineString>
  texts?: FeatureCollection<Point>
  images?: FeatureCollection<Point>
  //-- sinage_old の balloons に相当
  balloons?: FeatureCollection<Point>
  callouts?: FeatureCollection<Point>
}

//-- GeoJSON Feature の properties に格納する RouteItem の拡張情報
export interface RouteFeatureProperties {
  _id?: string
  type?: string
  width?: number
  color?: string
  /** 縞線: true のとき選択色と白を交互に表示 */
  stripe?: boolean
  /** 点線: "dashed" のとき破線表示 */
  style?: "solid" | "dashed"
  /** 縞線用 line-pattern の画像 ID（stripe 時のみ） */
  patternId?: string
}

//-- RouteItem を GeoJSON Feature<LineString> に変換する
export function routeItemToGeoJSONFeature(route: RouteItem): Feature<LineString, RouteFeatureProperties> {
  const color = route.color ?? "#FF0000"
  const stripe = route.stripe === true
  return {
    type: "Feature",
    id: route.id,
    geometry: {
      type: "LineString",
      coordinates: [...route.coordinates],
    },
    properties: {
      _id: route.id,
      type: route.type,
      width: route.width,
      color,
      stripe,
      style: route.type?.includes("DASHED") ? "dashed" : "solid",
      ...(stripe && { patternId: `stripe-pattern-${color.replace("#", "")}` }),
    },
  }
}

//-- GeoJSON Feature<LineString> を RouteItem に変換する
export function geoJSONFeatureToRouteItem(feature: Feature<LineString, RouteFeatureProperties>): RouteItem {
  const props = feature.properties ?? {}
  const id = (feature.id as string) ?? props._id ?? crypto.randomUUID()
  return {
    id: String(id),
    type: props.type ?? "",
    coordinates: [...(feature.geometry.coordinates as [number, number][])],
    width: props.width,
    color: props.color,
    stripe: props.stripe,
  }
}

//-- RouteItem[] を FeatureCollection<LineString> に変換する
export function routeItemsToFeatureCollection(routes: RouteItem[]): FeatureCollection<LineString, RouteFeatureProperties> {
  return {
    type: "FeatureCollection",
    features: routes.map(routeItemToGeoJSONFeature),
  }
}

//-- design_data.routes が RouteItem[] 形式かどうかを判定
function isRouteItemArray(routes: unknown): routes is RouteItem[] {
  if (!Array.isArray(routes)) return false
  if (routes.length === 0) return true
  const first = routes[0] as Record<string, unknown>
  return first != null && "coordinates" in first && !("type" in first && first.type === "FeatureCollection")
}

//-- GeoJSON Feature かどうかを判定
function isGeoJSONFeature(obj: unknown): obj is Feature<LineString, RouteFeatureProperties> {
  if (!obj || typeof obj !== "object") return false
  const o = obj as Record<string, unknown>
  return o.type === "Feature" && o.geometry != null && (o.geometry as { type?: string }).type === "LineString"
}

//-- GeoJSON FeatureCollection かどうかを判定
function isFeatureCollection(obj: unknown): obj is FeatureCollection<LineString, RouteFeatureProperties> {
  if (!obj || typeof obj !== "object") return false
  const o = obj as Record<string, unknown>
  return o.type === "FeatureCollection" && Array.isArray(o.features)
}

/**
 * 任意の形式の routes を FeatureCollection に正規化する（手順 9-2）。
 * API から取得した design_data の routes が RouteItem[] の場合に FeatureCollection に変換する。
 * MapPreview・restoreFeatures 等の内部利用向け。
 */
export function ensureRoutesAsFeatureCollection(routes: unknown): FeatureCollection<LineString, RouteFeatureProperties> {
  if (!routes) return { type: "FeatureCollection", features: [] }
  if (isRouteItemArray(routes)) return routeItemsToFeatureCollection(routes)
  if (isFeatureCollection(routes)) return routes
  if (Array.isArray(routes)) {
    const items = routes.filter(isGeoJSONFeature).map(geoJSONFeatureToRouteItem)
    return routeItemsToFeatureCollection(items)
  }
  return { type: "FeatureCollection", features: [] }
}

/**
 * 任意の形式の routes を design_data 形式（RouteItem[]）に正規化する。
 * API 送信・JSON 出力時に使用し、形式の一貫性を保つ。
 */
export function ensureRoutesAsRouteItems(routes: unknown): RouteItem[] {
  if (!routes) return []
  if (isRouteItemArray(routes)) return routes
  if (isFeatureCollection(routes)) {
    return routes.features
      .filter((f): f is Feature<LineString, RouteFeatureProperties> => isGeoJSONFeature(f))
      .map(geoJSONFeatureToRouteItem)
  }
  if (Array.isArray(routes)) {
    return routes
      .filter(isGeoJSONFeature)
      .map(geoJSONFeatureToRouteItem)
  }
  return []
}
