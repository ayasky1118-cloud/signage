//-- マップの状態をJSON形式で保存・読み込みする機能を提供するComposable
//-- design_data 形式（routes, texts, images, callouts）に合わせる
import type { Feature, FeatureCollection, LineString, Point } from "geojson"
import type { MapDataJson, RouteItem } from "../types/map-data"
import { geoJSONFeatureToRouteItem, type RouteFeatureProperties } from "../types/map-data"

export type MapState = {
  center: [number, number]
  zoom: number
  bearing?: number
  pitch?: number
}

type MapFeatures = {
  routeFeatures: FeatureCollection<LineString, Record<string, unknown>>
  textFeatures: FeatureCollection<Point>
  imageFeatures: FeatureCollection<Point>
  balloonFeatures: FeatureCollection<Point>
}

//-- FeatureCollection の routes を RouteItem[] に変換する
function routeFeaturesToRouteItems(
  routeFeatures: FeatureCollection<LineString, Record<string, unknown>>
): RouteItem[] {
  return routeFeatures.features.map((f) =>
    geoJSONFeatureToRouteItem(f as Feature<LineString, RouteFeatureProperties>)
  )
}

//-- design_data 形式でマップデータを構築する。routes は RouteItem[] に変換
export function buildMapData(
  mapState: MapState | null,
  features: MapFeatures,
  options?: { branchNo?: string; orderNo?: string }
): MapDataJson & { map?: MapState } {
  const data: MapDataJson & { map?: MapState } = {
    version: 1,
    branchNo: options?.branchNo,
    orderNo: options?.orderNo,
    routes: routeFeaturesToRouteItems(features.routeFeatures),
    texts: features.textFeatures,
    images: features.imageFeatures,
    callouts: features.balloonFeatures,
  }
  if (mapState) data.map = mapState
  return data
}

//-- JSON をファイルとしてダウンロードする
export function downloadMapJson(data: MapDataJson): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "map_state.json"
  a.click()
  URL.revokeObjectURL(url)
}

//-- JSON ファイルを読み込む。restoreFeatures に渡す形式で返す（routes は RouteItem[] または FeatureCollection のまま）
export function loadMapJson(file: File): Promise<MapDataJson> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string) as MapDataJson
        resolve(json)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function useMapData() {
  return {
    buildMapData,
    downloadMapJson,
    loadMapJson,
  }
}
