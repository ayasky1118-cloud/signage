<template>
  <!-- === 共通レイアウト === -->
  <div class="min-h-screen w-full min-w-0 bg-[#e2e8f0] text-slate-600 flex flex-col">
    <!-- -- ヘッダー -- -->
    <AppHeader />
    <!-- -- メイン（ルートに応じたページ） -- -->
    <div class="flex-1 w-full min-w-0">
      <router-view />
    </div>
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
