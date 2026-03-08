<template>
  <!-- 共通ヘッダー（全ページ共通。メインメニューへのリンク・ログイン表示・ログアウト） -->
  <header id="app-header" class="app-header">
    <!-- 左: メインメニューへのリンク（/menu） -->
    <h1 class="header-menu-link">
      <RouterLink to="/menu" class="header-menu-link-anchor">
        メインメニュー
      </RouterLink>
    </h1>
    <!-- 右: ログイン名表示・ログアウトボタン -->
    <div class="header-right">
      <span class="header-login-text">ログイン中: {{ loginName }}</span>
      <button
        type="button"
        class="btn btn-header-logout"
        @click="handleLogout"
      >
        ログアウト
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
//-- AppHeader - 共通ヘッダー
//--
//-- 【用途】
//-- ・全ページ共通で表示されるヘッダー
//-- ・メインメニュー（/menu）へのリンク、ログイン名表示、ログアウトボタンを配置
//--
//-- 【認証】
//-- ・現段階は localStorage から userName を取得し表示（デフォルト: 「ゲスト」）
//-- ・ログアウト時は isAuthed を削除し /menu へリダイレクト
//-- ・将来 Cognito 導入時に差し替え予定
import { ref, onMounted } from "vue"

//-------------------------------------------------------------------------------
//-- 状態・処理
//-------------------------------------------------------------------------------

//-- ヘッダーに表示するログイン名。マウント時に localStorage の userName を取得（未設定時は「ゲスト」）
const loginName = ref("ゲスト")

//-- ログアウト処理。localStorage の認証情報を削除し /menu へリダイレクト（将来: Cognito signOut）
function handleLogout() {
  localStorage.removeItem("isAuthed")
  window.location.href = "/menu"
}

//-- マウント時に localStorage から userName を取得して表示を更新
onMounted(() => {
  const stored = localStorage.getItem("userName")
  if (stored) loginName.value = stored
})
</script>

<style scoped>
.app-header {
  background-color: var(--color-main);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.header-menu-link {
  font-size: 1.25rem;
  font-weight: 400;
  letter-spacing: 0.05em;
}

.header-menu-link-anchor {
  color: white;
  transition: opacity 0.2s;
}

.header-menu-link-anchor:hover {
  opacity: 0.9;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-login-text {
  font-size: 0.875rem;
  opacity: 0.9;
}

.btn-header-logout {
  background: rgb(255 255 255 / 0.1);
  border: 1px solid rgb(255 255 255 / 0.3);
  padding: 0.375rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  color: white;
  transition: background 0.2s;
}

.btn-header-logout:hover {
  background: rgb(255 255 255 / 0.2);
}
</style>
