<script setup lang="ts">
//-- MapPreview - MapTiler + MapLibre で地図を表示するコンポーネント
//--
//-- 【用途】
//-- ・住所検証後のプレビュー表示（注文フォーム等）
//-- ・注文詳細画面での地図表示
//--
//-- 【動作モード】
//-- ・interactive=true: パン・ズーム・ナビゲーションコントロール有効（ユーザーが地図を操作可能）
//-- ・interactive=false: 表示のみ（編集操作は全画面モードで実施する想定。サイドバー等の小さいプレビュー用）
//--
//-- 【依存】
//-- ・MapTiler API キー（VITE_MAPTILER_API_KEY）が必須。未設定時はプレースホルダーを表示
import { ref, onMounted, onBeforeUnmount, watch } from "vue"
import type { FeatureCollection, LineString, Point } from "geojson"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useMapLayers } from "../composables/useMapLayers"
import type { RouteItem } from "../types/map-data"
import { routeItemsToFeatureCollection } from "../types/map-data"

const { loadMapImage, initLayers } = useMapLayers()

//-------------------------------------------------------------------------------
//-- Props 定義
//-------------------------------------------------------------------------------

const props = withDefaults(
  defineProps<{
    center?: [number, number] | null  //-- 地図の中心座標 [経度, 緯度]。null の場合は東京駅（139.7671, 35.6812）をデフォルト表示
    zoom?: number  //-- 初期ズームレベル（1〜22。15 が市街地の標準的な表示）
    apiKey?: string | null  //-- MapTiler API キー。未設定または空文字の場合は地図を表示せず「設定してください」メッセージを表示
    interactive?: boolean  //-- true: パン・ズーム・ナビゲーション有効。false: 表示のみ（クリック・ドラッグ無効）
    /** true のとき地図クリックで map-click を emit（全画面編集用） */
    emitMapClick?: boolean
    //-- html_object_value の IMAGE_PLACEMENT から取得した画像。getImageItemsFromHtmlObjects(htmlObjects) で生成
    imageItems?: { id: string; url: string }[]
    //-- 地図に表示するルート・テキスト・画像・吹き出し。mapDataByBranch 等から渡す
    designData?: {
      routes?: RouteItem[] | FeatureCollection<LineString> | unknown
      texts?: FeatureCollection<Point> | unknown
      images?: FeatureCollection<Point> | unknown
      callouts?: FeatureCollection<Point> | unknown
    } | null
  }>(),
  { center: null, zoom: 15, apiKey: null, interactive: true, emitMapClick: false, imageItems: () => [], designData: null }
)

const emit = defineEmits<{
  (e: "map-loaded", map: maplibregl.Map): void
  (e: "map-click", lngLat: { lng: number; lat: number }): void
}>()

//-------------------------------------------------------------------------------
//-- 地図インスタンス管理
//-------------------------------------------------------------------------------

//-- 地図を描画する DOM 要素への参照（template の ref="mapContainerRef" と対応）
const mapContainerRef = ref<HTMLDivElement | null>(null)

//-- MapLibre の Map インスタンス。コンポーネント外から参照するため let で保持
let map: maplibregl.Map | null = null

//-------------------------------------------------------------------------------
//-- 地図初期化・リサイズ
//-------------------------------------------------------------------------------

//-- 地図を初期化する。mapContainerRef と apiKey が有効な場合のみ実行。既存の map がある場合は remove してから新規作成。MapTiler の streets-v2 スタイルを使用
function initMap() {
  if (!mapContainerRef.value || !props.apiKey?.trim()) return

  //-- 既存インスタンスを破棄（props 変更で再初期化される場合のクリーンアップ）
  if (map) {
    map.remove()
    map = null
  }

  //-- 中心座標が未指定の場合は東京駅をデフォルトに
  const center = props.center ?? [139.7671, 35.6812]

  map = new maplibregl.Map({
    container: mapContainerRef.value,
    style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${props.apiKey.trim()}`,
    center,
    zoom: props.zoom,
    interactive: props.interactive,
  })

  //-- styleimagemissing: MapTiler スタイルが参照する POI アイコン等が未ロードの場合に発火。空画像を追加して Console 警告を抑制
  //-- MapTiler の POI は SDF 形式のため、sdf: true を指定して「SBF and non-SBF icons in one buffer」警告を回避
  map.on("styleimagemissing", (e) => {
    const id = e.id
    if (map?.hasImage(id)) return
    const size = 32
    const data = new Uint8ClampedArray(size * size * 4)
    map.addImage(id, { width: size, height: size, data, sdf: true })
  })

  //-- 操作可能モードの場合のみ、ズーム・コンパスボタンを右上に追加
  if (props.interactive) {
    map.addControl(new maplibregl.NavigationControl(), "top-right")
  }

  //-- 地図読み込み完了後にレイヤーを初期化。designData を GeoJSON 形式に変換して渡す
  map.once("load", async () => {
    const emptyRoute: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] }
    const emptyPoint: FeatureCollection<Point> = { type: "FeatureCollection", features: [] }
    const data = props.designData
    let routeFeatures = emptyRoute
    if (data?.routes !== undefined) {
      const routes = data.routes
      routeFeatures =
        Array.isArray(routes) && routes.length > 0 && "coordinates" in (routes[0] as RouteItem)
          ? routeItemsToFeatureCollection(routes as RouteItem[])
          : (routes as FeatureCollection<LineString>) ?? emptyRoute
    }
    const textFeatures = (data?.texts as FeatureCollection<Point>) ?? emptyPoint
    const imageFeatures = (data?.images as FeatureCollection<Point>) ?? emptyPoint
    const balloonFeatures = (data?.callouts as FeatureCollection<Point>) ?? emptyPoint
    await initLayers(
      map,
      {
        routeFeatures,
        textFeatures,
        imageFeatures,
        balloonFeatures,
        tempMarkerFeatures: emptyPoint,
      },
      props.imageItems
    )
    //-- レイヤー初期化後に designData の最新値を反映（非同期で designData が変わった場合）
    applyDesignDataToMap()
    if (props.emitMapClick) {
      map.on("click", (e) => emit("map-click", { lng: e.lngLat.lng, lat: e.lngLat.lat }))
    }
    emit("map-loaded", map)
  })
}

//-- 地図の表示領域をコンテナのサイズに合わせてリサイズする。親要素のサイズが動的に変わった場合（例: モーダル表示、タブ切替）に呼び出す。defineExpose で親コンポーネントから呼び出し可能。
function fitMapToContainer() {
  if (map) {
    map.resize()
  }
}

//-------------------------------------------------------------------------------
//-- ライフサイクル
//-------------------------------------------------------------------------------

//-- マウント時に apiKey が設定されていれば地図を初期化
onMounted(() => {
  if (props.apiKey?.trim()) {
    initMap()
  }
})

//-- アンマウント時に Map インスタンスを破棄してメモリリークを防止
onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

//-------------------------------------------------------------------------------
//-- Props 監視（center / apiKey 変更時の対応）
//-------------------------------------------------------------------------------

//-- center または apiKey が変更されたときの処理。apiKey が有効で map が存在: center が有効なら setCenter で中心を更新。apiKey が有効だが map が未作成: initMap で初期化
watch(
  () => [props.center, props.apiKey] as const,
  ([center, apiKey]) => {
    if (map && apiKey?.trim()) {
      if (center && center.length === 2) {
        map.setCenter(center as [number, number])
      }
    } else if (apiKey?.trim() && !map && mapContainerRef.value) {
      initMap()
    }
  }
)

//-- imageItems が後から設定された場合（htmlObjects の非同期取得後）に画像を登録する
watch(
  () => props.imageItems,
  async (items) => {
    if (!map || !items?.length) return
    if (map.isStyleLoaded()) {
      for (const item of items) {
        await loadMapImage(map, item.id, item.url)
      }
    } else {
      map.once("load", async () => {
        for (const item of items) {
          await loadMapImage(map!, item.id, item.url)
        }
      })
    }
  },
  { immediate: true }
)

//-- designData の変更を監視し、map のソースに setData する。initLayers 完了後のソースのみ更新
function applyDesignDataToMap() {
  if (!map) return
  const data = props.designData
  if (!data) return
  const routeSource = map.getSource("route") as maplibregl.GeoJSONSource | undefined
  const textsSource = map.getSource("texts") as maplibregl.GeoJSONSource | undefined
  const imagesSource = map.getSource("images") as maplibregl.GeoJSONSource | undefined
  const balloonsSource = map.getSource("balloons") as maplibregl.GeoJSONSource | undefined
  const emptyRoute: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] }
  const emptyPoint: FeatureCollection<Point> = { type: "FeatureCollection", features: [] }
  if (routeSource && data.routes !== undefined) {
    const routes = data.routes
    const fc: FeatureCollection<LineString> =
      Array.isArray(routes) && routes.length > 0 && "coordinates" in (routes[0] as RouteItem)
        ? routeItemsToFeatureCollection(routes as RouteItem[])
        : (routes as FeatureCollection<LineString>) ?? emptyRoute
    routeSource.setData(fc)
  }
  if (textsSource && data.texts !== undefined) textsSource.setData(data.texts ?? emptyPoint)
  if (imagesSource && data.images !== undefined) imagesSource.setData(data.images ?? emptyPoint)
  if (balloonsSource && data.callouts !== undefined) balloonsSource.setData(data.callouts ?? emptyPoint)
}

watch(
  () => props.designData,
  () => {
    if (!map) return
    if (map.isStyleLoaded()) {
      applyDesignDataToMap()
    } else {
      map.once("load", () => applyDesignDataToMap())
    }
  },
  { immediate: true, deep: true }
)

//-- 親コンポーネントから fitMapToContainer と map を呼び出せるように公開
//-- getMap: 地図インスタンスを取得。initMap 完了後に有効。OrderDetail でクリックハンドラ等を設定する際に使用
defineExpose({
  fitMapToContainer,
  getMap: () => map,
})
</script>

<template>
  <!-- apiKey 未設定時: 地図の代わりに設定促進メッセージを表示 -->
  <div v-if="!apiKey?.trim()" class="map-placeholder">
    VITE_MAPTILER_API_KEY を設定してください
  </div>
  <!-- apiKey 設定時: MapLibre がこの div をコンテナとして地図を描画 -->
  <div
    v-else
    ref="mapContainerRef"
    class="map-container"
  />
</template>

<style scoped>
.map-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(241 245 249);
  color: rgb(100 116 139);
  font-size: 0.75rem;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
  border-radius: inherit;
}

/* MapLibre が生成する .maplibregl-map にも角丸を適用（子要素のため :deep で指定） */
:deep(.maplibregl-map) {
  border-radius: inherit;
}
</style>
