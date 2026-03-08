//-- design_data と GeoJSON の橋渡し用型定義
import type { Feature, FeatureCollection, LineString, Point } from "geojson"

//-- ルート（線）1件の型。design_data.routes の各要素
export interface RouteItem {
  id: string
  //-- value_code（例: ROAD_CLOSED, DETOUR）
  type: string
  coordinates: [number, number][]
  width?: number
  color?: string
}

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
}

//-- RouteItem を GeoJSON Feature<LineString> に変換する
export function routeItemToGeoJSONFeature(route: RouteItem): Feature<LineString, RouteFeatureProperties> {
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
      color: route.color,
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
  }
}

//-- RouteItem[] を FeatureCollection<LineString> に変換する
export function routeItemsToFeatureCollection(routes: RouteItem[]): FeatureCollection<LineString, RouteFeatureProperties> {
  return {
    type: "FeatureCollection",
    features: routes.map(routeItemToGeoJSONFeature),
  }
}
