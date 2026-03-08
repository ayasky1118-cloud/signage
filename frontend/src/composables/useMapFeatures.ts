//-- 地図上に配置される要素のデータを管理するComposable
//-- ・テキストラベル
//-- ・画像アイコン
//-- ・吹き出し（callouts。内部では balloonFeatures）
//-- ・ルート
//-- ・ルート描画時の一時マーカー
import { ref } from "vue"
import type { FeatureCollection, Feature, Point, LineString } from "geojson"
import type maplibregl from "maplibre-gl"
import type { RouteItem } from "../types/map-data"
import { routeItemsToFeatureCollection } from "../types/map-data"

const genId = () => crypto.randomUUID()

export type EditMode = "none" | "text" | "image" | "balloon" | "route" | "move"

export function useMapFeatures() {
  //-- テキスト
  const textFeatures = ref<FeatureCollection<Point>>({
    type: "FeatureCollection",
    features: [],
  })

  //-- 画像
  type ImageFeatureProps = {
    imageId: string
    scale: number
    rotate: number
  }
  const imageFeatures = ref<FeatureCollection<Point, ImageFeatureProps>>({
    type: "FeatureCollection",
    features: [],
  })

  //-- 吹き出し（signage の design_data では callouts。useMapLayers のソース id は balloons）
  const balloonFeatures = ref<FeatureCollection<Point, { iconId: string; scale: number; text: string }>>({
    type: "FeatureCollection",
    features: [],
  })

  //-- ルート
  const routeFeatures = ref<FeatureCollection<LineString, Record<string, unknown>>>({
    type: "FeatureCollection",
    features: [],
  })

  //-- 一時マーカー
  const tempMarkerFeatures = ref<FeatureCollection<Point, Record<string, unknown>>({
    type: "FeatureCollection",
    features: [],
  })

  const tempCoordinates = ref<[number, number][]>([])

  //-- テキスト追加
  const addText = (map: maplibregl.Map | null, lng: number, lat: number, text: string): EditMode => {
    if (!map) return "text"
    textFeatures.value.features.push({
      type: "Feature",
      id: genId(),
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: { _id: genId(), text },
    } as Feature<Point>)
    const source = map.getSource("texts") as maplibregl.GeoJSONSource
    source?.setData(textFeatures.value)
    return "text"
  }

  //-- 画像追加
  const addImage = (map: maplibregl.Map | null, lng: number, lat: number, imageId: string): EditMode => {
    if (!map) return "image"
    imageFeatures.value.features.push({
      type: "Feature",
      id: genId(),
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: { imageId, scale: 0.5, rotate: 0 },
    } as Feature<Point, ImageFeatureProps>)
    const source = map.getSource("images") as maplibregl.GeoJSONSource
    source?.setData(imageFeatures.value)
    return "image"
  }

  //-- 吹き出し追加
  const addBalloon = (map: maplibregl.Map | null, lng: number, lat: number, text: string): EditMode => {
    if (!map) return "balloon"
    balloonFeatures.value.features.push({
      type: "Feature",
      id: genId(),
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: { iconId: "balloon-square", scale: 0.3, text },
    } as Feature<Point, { iconId: string; scale: number; text: string }>)
    const source = map.getSource("balloons") as maplibregl.GeoJSONSource
    source?.setData(balloonFeatures.value)
    return "balloon"
  }

  //-- ルート描画（Phase 6 で lineType / lineStyle を渡せるように拡張予定）
  const drawRoute = (map: maplibregl.Map | null): EditMode | null => {
    if (!map || tempCoordinates.value.length === 0) return null
    const newRoute: Feature<LineString, Record<string, unknown>> = {
      type: "Feature",
      id: genId(),
      geometry: { type: "LineString", coordinates: [...tempCoordinates.value] },
      properties: {},
    }
    routeFeatures.value.features.push(newRoute)
    const routeSource = map.getSource("route") as maplibregl.GeoJSONSource
    routeSource?.setData(routeFeatures.value)
    tempCoordinates.value = []
    tempMarkerFeatures.value.features = []
    const tempSource = map.getSource("temp-markers") as maplibregl.GeoJSONSource
    tempSource?.setData(tempMarkerFeatures.value)
    return "route"
  }

  //-- 一時マーカー追加
  const addTempMarker = (map: maplibregl.Map | null, lng: number, lat: number): void => {
    if (!map) return
    tempCoordinates.value.push([lng, lat])
    tempMarkerFeatures.value.features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {},
    } as Feature<Point>)
    const tempSource = map.getSource("temp-markers") as maplibregl.GeoJSONSource
    tempSource?.setData(tempMarkerFeatures.value)
  }

  //-- design_data の routes が RouteItem[] か FeatureCollection かを判定する
  function isRouteItemArray(routes: unknown): routes is RouteItem[] {
    if (!Array.isArray(routes)) return false
    if (routes.length === 0) return true
    const first = routes[0] as Record<string, unknown>
    return first != null && "coordinates" in first && !("type" in first && first.type === "FeatureCollection")
  }

  //-- データ復元。data のキーは design_data 形式（routes, texts, images, callouts）。balloons は callouts の互換で受け付ける
  const restoreFeatures = (map: maplibregl.Map | null, data: Record<string, unknown>): void => {
    if (!map) return
    textFeatures.value = (data.texts as FeatureCollection<Point>) || { type: "FeatureCollection", features: [] }
    imageFeatures.value = (data.images as FeatureCollection<Point, ImageFeatureProps>) || { type: "FeatureCollection", features: [] }
    balloonFeatures.value =
      (data.callouts as FeatureCollection<Point, { iconId: string; scale: number; text: string }>) ||
      (data.balloons as FeatureCollection<Point, { iconId: string; scale: number; text: string }>) ||
      { type: "FeatureCollection", features: [] }
    //-- routes: RouteItem[] の場合は FeatureCollection に変換
    const rawRoutes = data.routes
    if (isRouteItemArray(rawRoutes)) {
      routeFeatures.value = routeItemsToFeatureCollection(rawRoutes)
    } else {
      routeFeatures.value = (rawRoutes as FeatureCollection<LineString>) || { type: "FeatureCollection", features: [] }
    }
    ;(map.getSource("texts") as maplibregl.GeoJSONSource)?.setData(textFeatures.value)
    ;(map.getSource("images") as maplibregl.GeoJSONSource)?.setData(imageFeatures.value)
    ;(map.getSource("balloons") as maplibregl.GeoJSONSource)?.setData(balloonFeatures.value)
    ;(map.getSource("route") as maplibregl.GeoJSONSource)?.setData(routeFeatures.value)
  }

  return {
    textFeatures,
    imageFeatures,
    balloonFeatures,
    routeFeatures,
    tempMarkerFeatures,
    tempCoordinates,
    addText,
    addImage,
    addBalloon,
    drawRoute,
    addTempMarker,
    restoreFeatures,
  }
}
