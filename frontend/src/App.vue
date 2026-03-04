<script setup lang="ts">
/**
 * App.vue
 * アプリケーションのルートコンポーネント。ルーティングされたページを表示するための枠となる。
 */
import { watch } from "vue"
import { useRoute } from "vue-router"
import AppHeader from "./components/AppHeader.vue"

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
  <!-- 全体レイアウト：ヘッダー + ルートに応じたページコンテンツ -->
  <div class="min-h-screen bg-[#e2e8f0] text-slate-600">
    <AppHeader />
    <router-view />
  </div>
</template>