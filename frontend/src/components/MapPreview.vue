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
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useMapLayers } from "../composables/useMapLayers"

const { loadMapImage } = useMapLayers()

//-------------------------------------------------------------------------------
//-- Props 定義
//-------------------------------------------------------------------------------

const props = withDefaults(
  defineProps<{
    center?: [number, number] | null  //-- 地図の中心座標 [経度, 緯度]。null の場合は東京駅（139.7671, 35.6812）をデフォルト表示
    zoom?: number  //-- 初期ズームレベル（1〜22。15 が市街地の標準的な表示）
    apiKey?: string | null  //-- MapTiler API キー。未設定または空文字の場合は地図を表示せず「設定してください」メッセージを表示
    interactive?: boolean  //-- true: パン・ズーム・ナビゲーション有効。false: 表示のみ（クリック・ドラッグ無効）
    //-- html_object_value の IMAGE_PLACEMENT から取得した画像。getImageItemsFromHtmlObjects(htmlObjects) で生成
    imageItems?: { id: string; url: string }[]
  }>(),
  { center: null, zoom: 15, apiKey: null, interactive: true, imageItems: () => [] }
)

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

  //-- 操作可能モードの場合のみ、ズーム・コンパスボタンを右上に追加
  if (props.interactive) {
    map.addControl(new maplibregl.NavigationControl(), "top-right")
  }
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

//-- 親コンポーネントから fitMapToContainer を呼び出せるように公開
defineExpose({ fitMapToContainer })
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
