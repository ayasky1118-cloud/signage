<template>
  <!-- === 共通レイアウト === -->
  <div class="page">
    <!-- -- ヘッダー -- -->
    <AppHeader />
    <!-- -- メイン（ルートに応じたページ） -- -->
    <div class="page-content">
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

<style scoped>
.page {
  min-height: 100vh;
  width: 100%;
  min-width: 0;
  background-color: #e2e8f0;
  color: rgb(71 85 105);
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  width: 100%;
  min-width: 0;
}
</style>
