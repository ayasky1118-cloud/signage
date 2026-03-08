//-- ユーザーの操作を記録し、Undo/Redo機能を提供するComposable
import { ref } from "vue"
import type maplibregl from "maplibre-gl"
import type { FeatureCollection } from "geojson"
import type { EditMode } from "./useMapFeatures"

type HistoryAction = {
  type: EditMode
}

export function useMapHistory() {
  const undoStack = ref<HistoryAction[]>([])

  const pushHistory = (type: EditMode): void => {
    undoStack.value.push({ type })
  }

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
    undoLastAction,
  }
}
