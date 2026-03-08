<script setup lang="ts">
//-- Menu - メニュー画面
//--
//-- 【用途】
//-- ・注文・看板管理システムのトップ画面
//-- ・3つの操作への導線を提供:
//--   1. 注文一覧 → /order/list（検索・一覧表示・ダブルクリックで詳細）
//--   2. 注文（新規・変更）→ /order/main（注文登録・既存注文の編集）
//--   3. 看板編集 → /order/detail（地図上のルート・テキスト・画像等の編集）
//--
//-- 【設計】
//-- ・RouterLink はグローバル登録のため import 不要
//-- ・従来の CSS でセマンティックなクラス名を使用（可読性重視）
</script>

<template>
  <!--
    メニュー画面（トップ）。3つの操作への導線を提供。
    - 注文一覧: /order/list
    - 注文（新規・変更）: /order/main
    - 看板編集: /order/detail
  -->
  <main id="menu-page" class="menu-page">
    <div class="menu-card">
      <div class="page-card-header menu-card-header">
        <h2>メニュー</h2>
      </div>
      <div class="menu-card-body">
        <!-- メニュー項目一覧。flex で縦並び、gap: 1rem -->
        <div class="menu-list">
          <RouterLink to="/order/list" class="menu-item">
            <div class="menu-item-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <span class="menu-item-label">注文一覧</span>
            <svg class="menu-item-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </RouterLink>
          <RouterLink to="/order/main" class="menu-item">
            <div class="menu-item-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <span class="menu-item-label">注文（新規・変更）</span>
            <svg class="menu-item-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </RouterLink>
          <RouterLink to="/order/detail" class="menu-item">
            <div class="menu-item-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span class="menu-item-label">看板編集</span>
            <svg class="menu-item-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </RouterLink>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* 05f007f 準拠: max-w-3xl(48rem) mx-auto py-10 px-6 */
.menu-page {
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
}

/* カード本体。白背景・角丸・シャドウ・ボーダー */
.menu-card {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 10px 25px -5px rgb(0 0 0 / 0.08), 0 0 0 1px rgb(0 0 0 / 0.03);
  border: 1px solid rgb(226 232 240 / 0.8);
  overflow: hidden;
}

.menu-card-body {
  padding: 2rem;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* メニュー項目1件。RouterLink で遷移。ホバーで軽く浮き上がる（translateY -2px） */
.menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  background-color: white;
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(0 59 130 / 0.25);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 0 0 1px rgb(226 232 240 / 0.8);
  transition: all 0.2s;
  text-decoration: none;
  color: var(--color-main);
}

.menu-item:hover,
.menu-item:focus {
  background-color: rgb(0 59 130 / 0.06);
  border-color: rgb(0 59 130 / 0.4);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px -2px rgb(0 0 0 / 0.08), 0 0 0 1px rgb(0 59 130 / 0.2);
  outline: none;
}

.menu-item-icon {
  background: rgb(0 59 130 / 0.08);
  padding: 0.75rem;
  border-radius: 0.5rem;
  transition: background 0.2s;
}

.menu-item:hover .menu-item-icon,
.menu-item:focus .menu-item-icon {
  background: rgb(0 59 130 / 0.12);
}

.menu-item-icon svg {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--color-main);
}

.menu-item-label {
  flex: 1;
  text-align: center;
  font-size: 1.125rem;
  font-weight: 400;
  color: var(--color-main);
}

.menu-item-arrow {
  width: 1.5rem;
  height: 1.5rem;
  color: rgb(0 59 130 / 0.5);
  margin-left: auto;
  transition: color 0.2s;
}

.menu-item:hover .menu-item-arrow,
.menu-item:focus .menu-item-arrow {
  color: var(--color-main);
}
</style>
