<script setup lang="ts">
/**
 * App.vue
 * アプリケーションのルートコンポーネント。ルーティングされたページを表示するための枠となる。
 */
import { watch } from "vue"
import { useRoute } from "vue-router"
import DefaultLayout from "./layouts/DefaultLayout.vue"

const route = useRoute()

// メニュー画面（/menu）ではヘッダーの表示を変えるため、body にクラスを付与
// common.css の .header-menu-only でスタイルを切り替え
watch(
  () => route.path,
  (path) => {
    document.body.classList.toggle("header-menu-only", path === "/menu")
  },
  { immediate: true }
)
</script>

<template>
  <DefaultLayout />
</template>