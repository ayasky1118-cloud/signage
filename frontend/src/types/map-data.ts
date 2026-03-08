//-- map-data.ts
//--
//-- design_data と GeoJSON の橋渡し用型定義。
//-- 看板編集画面（OrderDetail）で地図上のルート・テキスト・画像・吹き出しを扱う際に使用。
//--
//-- ■ 形式の使い分け
//-- - 内部・MapPreview・restoreFeatures: GeoJSON FeatureCollection
//-- - API 送信・JSON 出力・design_data: RouteItem[] 形式
import type { Feature, FeatureCollection, LineString, Point } from "geojson"

//-------------------------------------------------------------------------------
//-- RouteItem（design_data.routes の要素形式）
//-------------------------------------------------------------------------------

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
  /** UUID。一意識別子。新規作成時は crypto.randomUUID() */
  id: string
  /** value_code（例: SOLID_RED_W4, STRIPE_BLUE_W4）。html_object_value の value_code */
  type: string
  /** 経路の座標 [[lng, lat], [lng, lat], ...]。WGS84 */
  coordinates: [number, number][]
  /** 線の太さ（オプション） */
  width?: number
  /** 線の色（オプション。例: #FF0000）。未指定時は routeItemToGeoJSONFeature で #FF0000 にフォールバック */
  color?: string
  /** 縞線: true のとき選択色と白を交互に表示 */
  stripe?: boolean
}

/** design_data.routes の型。RouteItem[] に統一 */
export type DesignDataRoutes = RouteItem[]

//-------------------------------------------------------------------------------
//-- MapDataJson（地図データの JSON 形式）
//-------------------------------------------------------------------------------

//-- 枝番ごとのルート・テキスト・画像・吹き出し等を保持。地図出力/読込・API 送受信で使用
export interface MapDataJson {
  /** スキーマバージョン。将来の互換性用 */
  version: number
  /** 枝番（2桁ゼロ埋め。例: "01"） */
  branchNo?: string
  /** 注文番号 */
  orderNo?: string
  /** ルート（経路）一覧。RouteItem[] または GeoJSON FeatureCollection のいずれかで格納される */
  routes?: RouteItem[] | FeatureCollection<LineString>
  /** テキスト配置。GeoJSON Point の FeatureCollection */
  texts?: FeatureCollection<Point>
  /** 画像配置。GeoJSON Point の FeatureCollection */
  images?: FeatureCollection<Point>
  /** 吹き出し配置。sinage_old の balloons に相当 */
  balloons?: FeatureCollection<Point>
  /** 吹き出し配置（callouts は balloons の別名として扱う場合あり） */
  callouts?: FeatureCollection<Point>
}

//-------------------------------------------------------------------------------
//-- RouteFeatureProperties（GeoJSON Feature の properties）
//-------------------------------------------------------------------------------

//-- GeoJSON Feature<LineString> の properties に格納する RouteItem の拡張情報。MapLibre の描画用
export interface RouteFeatureProperties {
  /** RouteItem.id と同一。Feature の id と properties の両方に持たせる */
  _id?: string
  /** value_code。RouteItem.type と同一 */
  type?: string
  /** 線の太さ */
  width?: number
  /** 線の色 */
  color?: string
  /** 縞線: true のとき選択色と白を交互に表示 */
  stripe?: boolean
  /** 点線: "dashed" のとき破線表示。type に "DASHED" を含むと自動で dashed */
  style?: "solid" | "dashed"
  /** 縞線用 line-pattern の画像 ID（stripe 時のみ。例: stripe-pattern-FF0000） */
  patternId?: string
}

//-------------------------------------------------------------------------------
//-- 変換関数（RouteItem ⇔ GeoJSON）
//-------------------------------------------------------------------------------

//-- RouteItem を GeoJSON Feature<LineString> に変換。MapLibre のソース用
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
      style: route.type?.includes("DASHED") ? "dashed" : "solid",  //-- value_code に DASHED を含むと破線
      ...(stripe && { patternId: `stripe-pattern-${color.replace("#", "")}` }),  //-- 縞線用パターンID
    },
  }
}

//-- GeoJSON Feature<LineString> を RouteItem に変換。API 送信・JSON 出力時に使用
export function geoJSONFeatureToRouteItem(feature: Feature<LineString, RouteFeatureProperties>): RouteItem {
  const props = feature.properties ?? {}
  const id = (feature.id as string) ?? props._id ?? crypto.randomUUID()  //-- id 欠損時は新規 UUID を発行
  return {
    id: String(id),
    type: props.type ?? "",
    coordinates: [...(feature.geometry.coordinates as [number, number][])],
    width: props.width,
    color: props.color,
    stripe: props.stripe,
  }
}

//-- RouteItem[] を FeatureCollection<LineString> に変換。MapPreview 等の内部利用向け
export function routeItemsToFeatureCollection(routes: RouteItem[]): FeatureCollection<LineString, RouteFeatureProperties> {
  return {
    type: "FeatureCollection",
    features: routes.map(routeItemToGeoJSONFeature),
  }
}

//-------------------------------------------------------------------------------
//-- 型ガード（正規化処理で使用）
//-------------------------------------------------------------------------------

//-- design_data.routes が RouteItem[] 形式かどうかを判定。先頭要素に coordinates があり、type が FeatureCollection でなければ RouteItem[] とみなす
function isRouteItemArray(routes: unknown): routes is RouteItem[] {
  if (!Array.isArray(routes)) return false
  if (routes.length === 0) return true
  const first = routes[0] as Record<string, unknown>
  return first != null && "coordinates" in first && !("type" in first && first.type === "FeatureCollection")
}

//-- GeoJSON Feature<LineString> かどうかを判定。type=Feature かつ geometry.type=LineString
function isGeoJSONFeature(obj: unknown): obj is Feature<LineString, RouteFeatureProperties> {
  if (!obj || typeof obj !== "object") return false
  const o = obj as Record<string, unknown>
  return o.type === "Feature" && o.geometry != null && (o.geometry as { type?: string }).type === "LineString"
}

//-- GeoJSON FeatureCollection かどうかを判定。type=FeatureCollection かつ features が配列
function isFeatureCollection(obj: unknown): obj is FeatureCollection<LineString, RouteFeatureProperties> {
  if (!obj || typeof obj !== "object") return false
  const o = obj as Record<string, unknown>
  return o.type === "FeatureCollection" && Array.isArray(o.features)
}

//-------------------------------------------------------------------------------
//-- 正規化関数（任意形式 → 統一形式）
//-------------------------------------------------------------------------------

/**
 * 任意の形式の routes を FeatureCollection に正規化する（手順 9-2）。
 * API から取得した design_data の routes が RouteItem[] の場合に FeatureCollection に変換する。
 * MapPreview・restoreFeatures 等の内部利用向け。
 */
export function ensureRoutesAsFeatureCollection(routes: unknown): FeatureCollection<LineString, RouteFeatureProperties> {
  if (!routes) return { type: "FeatureCollection", features: [] }
  if (isRouteItemArray(routes)) return routeItemsToFeatureCollection(routes)
  if (isFeatureCollection(routes)) return routes
  //-- 配列だが RouteItem[] でも FeatureCollection でもない場合（混在等）: Feature のみ抽出して RouteItem に変換
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
  //-- 配列だが RouteItem[] でも FeatureCollection でもない場合: Feature のみ抽出して RouteItem に変換
  if (Array.isArray(routes)) {
    return routes
      .filter(isGeoJSONFeature)
      .map(geoJSONFeatureToRouteItem)
  }
  return []
}
