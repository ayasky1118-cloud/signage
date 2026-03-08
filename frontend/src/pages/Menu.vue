<script setup lang="ts">
/**
 * Menu - メニュー画面
 *
 * 【用途】
 * ・注文・看板管理システムのトップ画面
 * ・3つの操作への導線を提供:
 *   1. 注文一覧 → /order/list（検索・一覧表示・ダブルクリックで詳細）
 *   2. 注文（新規・変更）→ /order/main（注文登録・既存注文の編集）
 *   3. 看板編集 → /order/detail（地図上のルート・テキスト・画像等の編集）
 *
 * 【設計】
 * ・RouterLink はグローバル登録のため import 不要
 * ・従来の CSS でセマンティックなクラス名を使用（可読性重視）
 */
</script>

<template>
  <main id="menu-page" class="menu-page">
    <div class="menu-card">
      <div class="menu-card-header">
        <h2 class="menu-card-title">メニュー</h2>
      </div>
      <div class="menu-card-body">
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
/* 05f007f 準拠: max-w-3xl mx-auto py-10 px-6 */
.menu-page {
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
}

.menu-card {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 10px 25px -5px rgb(0 0 0 / 0.08), 0 0 0 1px rgb(0 0 0 / 0.03);
  border: 1px solid rgb(226 232 240 / 0.8);
  overflow: hidden;
}

/* 05f007f 準拠: px-8, text-lg */
.menu-card-header {
  background-color: var(--color-main);
  border-bottom: 1px solid rgb(226 232 240);
  padding: 0.5rem 2rem;
}

.menu-card-title {
  font-size: 1.125rem;
  font-weight: 400;
  color: white;
}

.menu-card-body {
  padding: 2rem;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  background-color: var(--color-main);
  padding: 1rem;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgb(0 59 130 / 0.1);
  transition: all 0.2s;
  text-decoration: none;
  color: white;
}

.menu-item:hover,
.menu-item:focus {
  background-color: var(--color-sub-blue);
  transform: translateY(-2px);
  outline: none;
}

.menu-item-icon {
  background: rgb(255 255 255 / 0.1);
  padding: 0.75rem;
  border-radius: 0.5rem;
  transition: background 0.2s;
}

.menu-item:hover .menu-item-icon,
.menu-item:focus .menu-item-icon {
  background: rgb(255 255 255 / 0.2);
}

.menu-item-icon svg {
  width: 1.5rem;
  height: 1.5rem;
  color: white;
}

/* 05f007f 準拠: text-lg font-normal */
.menu-item-label {
  flex: 1;
  text-align: center;
  font-size: 1.125rem;
  font-weight: 400;
  color: white;
}

.menu-item-arrow {
  width: 1.5rem;
  height: 1.5rem;
  color: rgb(255 255 255 / 0.5);
  margin-left: auto;
  transition: color 0.2s;
}

.menu-item:hover .menu-item-arrow,
.menu-item:focus .menu-item-arrow {
  color: white;
}
</style>
