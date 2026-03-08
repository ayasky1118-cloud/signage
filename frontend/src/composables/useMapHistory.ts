//-- ユーザーの操作を記録し、Undo 機能を提供する Composable
//--
//-- 【設計】
//-- ・undoStack には「操作の種類（route/text/image/balloon）」のみを保持。フル状態は持たない（メモリ効率）。
//-- ・undo 時は該当 FeatureCollection の末尾を pop する。追加順の逆順で取り消す。
import { ref } from "vue"
import type maplibregl from "maplibre-gl"
import type { FeatureCollection } from "geojson"
import type { EditMode } from "./useMapFeatures"
import { ensureStripePatterns } from "./useMapLayers"

type HistoryAction = {
  type: EditMode
}

export function useMapHistory() {
  const undoStack = ref<HistoryAction[]>([])

  //-- 操作を記録する。addText / addImage / addBalloon / drawRoute の直後に呼ぶこと。
  const pushHistory = (type: EditMode): void => {
    undoStack.value.push({ type })
  }

  const clearHistory = (): void => {
    undoStack.value = []
  }

  //-- 最後の操作を取り消す。features は useMapFeatures の ref をそのまま渡す（参照で pop される）。
  //-- callouts は useMapFeatures の balloonFeatures に相当。MapLibre のソース id は balloons
  const undoLastAction = (
    map: maplibregl.Map | null,
    features: {
      routeFeatures: FeatureCollection
      textFeatures: FeatureCollection
      imageFeatures: FeatureCollection
      callouts: FeatureCollection
    }
  ): void => {
    if (!map || undoStack.value.length === 0) return
    const last = undoStack.value.pop()
    if (!last) return
    switch (last.type) {
      case "route":
        features.routeFeatures.features.pop()
        ensureStripePatterns(map, features.routeFeatures)
        ;(map.getSource("route") as maplibregl.GeoJSONSource)?.setData(features.routeFeatures)
        break
      case "text":
        features.textFeatures.features.pop()
        ;(map.getSource("texts") as maplibregl.GeoJSONSource)?.setData(features.textFeatures)
        break
      case "image":
        features.imageFeatures.features.pop()
        ;(map.getSource("images") as maplibregl.GeoJSONSource)?.setData(features.imageFeatures)
        break
      case "balloon":
        features.callouts.features.pop()
        ;(map.getSource("balloons") as maplibregl.GeoJSONSource)?.setData(features.callouts)
        break
    }
  }

  return {
    undoStack,
    pushHistory,
    clearHistory,
    undoLastAction,
  }
}
