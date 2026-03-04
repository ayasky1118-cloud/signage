<template>
  <!-- 共通レイアウト：ヘッダー + ルートに応じたページコンテンツ -->
  <div class="min-h-screen bg-[#e2e8f0] text-slate-600">
    <AppHeader />
    <router-view />
  </div>
</template>

<script setup lang="ts">
/**
 * DefaultLayout
 * 共通レイアウト（ヘッダー・フッター等）
 * ログアウトボタン等を含むヘッダーと、ページコンテンツ領域を提供する。
 */
import AppHeader from "../components/AppHeader.vue"
</script>
