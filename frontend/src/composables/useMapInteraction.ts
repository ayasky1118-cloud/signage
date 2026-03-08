//-- ユーザーのマウス操作（クリック・ドラッグ）を処理する Composable
//--
//-- 【editMode】
//-- ・route: ルート描画モード（クリックでポイント追加）。デフォルト。地図編集の主操作であるため初期値を route にしている
//-- ・text / image / balloon: 配置モード。1回クリックで配置後、自動で route に戻る
//-- ・move: ドラッグでテキスト・画像・吹き出しを移動
import { ref } from "vue"
import type maplibregl from "maplibre-gl"
import type { FeatureCollection, Point } from "geojson"
import type { EditMode } from "./useMapFeatures"

//-- layer は useMapLayers で登録した MapLibre のソース/レイヤー ID と一致させる必要がある（texts, images, balloons, routes）
type SelectedItem =
  | { layer: "texts"; index: number }
  | { layer: "images"; index: number }
  | { layer: "balloons"; index: number }
  | { layer: "routes"; index: number }
  | null

export function useMapInteraction() {
  const editMode = ref<EditMode>("route")
  const selectedItem = ref<SelectedItem>(null)
  const isDragging = ref(false)

  //-- 地図クリック時のハンドラを登録。editMode に応じて onText / onImage / onBalloon / onRoute を呼ぶ
  const setupClickHandler = (
    map: maplibregl.Map,
    handlers: {
      onText: (lng: number, lat: number) => void
      onImage: (lng: number, lat: number) => void
      onBalloon: (lng: number, lat: number) => void
      onRoute: (lng: number, lat: number) => void
    }
  ) => {
    map.on("click", (e) => {
      switch (editMode.value) {
        case "text":
          handlers.onText(e.lngLat.lng, e.lngLat.lat)
          editMode.value = "route"
          break
        case "image":
          handlers.onImage(e.lngLat.lng, e.lngLat.lat)
          editMode.value = "route"
          break
        case "balloon":
          handlers.onBalloon(e.lngLat.lng, e.lngLat.lat)
          editMode.value = "route"
          break
        case "route":
          handlers.onRoute(e.lngLat.lng, e.lngLat.lat)
          break
      }
    })
  }

  //-- ドラッグでテキスト・画像・吹き出しを移動。balloonFeatures は useMapLayers のソース id が balloons のためそのまま
  const setupDragHandler = (
    map: maplibregl.Map,
    features: {
      textFeatures: FeatureCollection<Point>
      imageFeatures: FeatureCollection<Point>
      balloonFeatures: FeatureCollection<Point>
    }
  ) => {
    map.on("mousedown", (e) => {
      if (editMode.value !== "move") return
      const renderedFeatures = map.queryRenderedFeatures(e.point, {
        layers: ["texts", "images", "balloons"],
      })
      if (renderedFeatures.length === 0) return
      const f = renderedFeatures[0]
      if (f?.layer.id === "texts") {
        const index = features.textFeatures.features.findIndex((ft) => ft.id === f.id)
        selectedItem.value = { layer: "texts", index }
      } else if (f?.layer.id === "images") {
        const index = features.imageFeatures.features.findIndex((ft) => ft.id === f.id)
        selectedItem.value = { layer: "images", index }
      } else if (f?.layer.id === "balloons") {
        const index = features.balloonFeatures.features.findIndex((ft) => ft.id === f.id)
        selectedItem.value = { layer: "balloons", index }
      }
      if (!selectedItem.value) return
      isDragging.value = true
      map.getCanvas().style.cursor = "grabbing"
      map.dragPan.disable()
    })

    map.on("mousemove", (e) => {
      if (!isDragging.value || !selectedItem.value) return
      const { lng, lat } = e.lngLat
      switch (selectedItem.value.layer) {
        case "texts":
          features.textFeatures.features[selectedItem.value.index]!.geometry.coordinates = [lng, lat]
          ;(map.getSource("texts") as maplibregl.GeoJSONSource).setData(features.textFeatures)
          break
        case "images":
          features.imageFeatures.features[selectedItem.value.index]!.geometry.coordinates = [lng, lat]
          ;(map.getSource("images") as maplibregl.GeoJSONSource).setData(features.imageFeatures)
          break
        case "balloons":
          features.balloonFeatures.features[selectedItem.value.index]!.geometry.coordinates = [lng, lat]
          ;(map.getSource("balloons") as maplibregl.GeoJSONSource).setData(features.balloonFeatures)
          break
      }
    })

    map.on("mouseup", () => {
      if (!isDragging.value) return
      isDragging.value = false
      map.dragPan.enable()
      map.getCanvas().style.cursor = ""
    })
  }

  return {
    editMode,
    selectedItem,
    isDragging,
    setupClickHandler,
    setupDragHandler,
  }
}
