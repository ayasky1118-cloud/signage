<script setup lang="ts">
/**
 * MapTiler + MapLibre で地図を表示するコンポーネント
 * 住所を中心に表示し、マウスでパン・ズーム可能
 */
import { ref, onMounted, onBeforeUnmount, watch } from "vue"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

const props = withDefaults(
  defineProps<{
    /** 中心座標 [lng, lat] */
    center?: [number, number] | null
    /** 初期ズームレベル（デフォルト 15） */
    zoom?: number
    /** MapTiler API キー（未設定時は地図を表示しない） */
    apiKey?: string | null
  }>(),
  { center: null, zoom: 15, apiKey: null }
)

const mapContainerRef = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null

function initMap() {
  if (!mapContainerRef.value || !props.apiKey?.trim()) return
  if (map) {
    map.remove()
    map = null
  }
  const center = props.center ?? [139.7671, 35.6812] // 東京駅のデフォルト
  map = new maplibregl.Map({
    container: mapContainerRef.value,
    style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${props.apiKey.trim()}`,
    center,
    zoom: props.zoom,
  })
  map.addControl(new maplibregl.NavigationControl(), "top-right")
}

function fitMapToContainer() {
  if (map) {
    map.resize()
  }
}

onMounted(() => {
  if (props.apiKey?.trim()) {
    initMap()
  }
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

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

defineExpose({ fitMapToContainer })
</script>

<template>
  <div v-if="!apiKey?.trim()" class="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 text-xs">
    VITE_MAPTILER_API_KEY を設定してください
  </div>
  <div
    v-else
    ref="mapContainerRef"
    class="w-full h-full min-h-[200px] map-container"
  />
</template>

<style scoped>
.map-container {
  border-radius: inherit;
}
:deep(.maplibregl-map) {
  border-radius: inherit;
}
</style>
