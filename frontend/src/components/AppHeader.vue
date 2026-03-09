<template>
  <!--
    共通ヘッダー（全ページ共通）
    - 左: メインメニュー（/menu）へのリンク
    - 右: ログイン名表示 + ログアウトボタン
    - App.vue で全ルートに配置
  -->
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
//-- ・AWS Cognito（Amplify Authenticator）の useAuthenticator でユーザー情報と signOut を取得
//-- ・ログアウト時は signOut を実行し、Authenticator がログイン画面を表示
import { computed } from "vue"
import { useRouter } from "vue-router"
import { useAuthenticator } from "@aws-amplify/ui-vue"

//-------------------------------------------------------------------------------
//-- 状態・処理
//-------------------------------------------------------------------------------

const router = useRouter()
const { user, signOut } = useAuthenticator()

//-- ヘッダーに表示するログイン名。Cognito の loginId（ユーザーID/メールアドレス）を表示
const loginName = computed(() => user.value?.signInDetails?.loginId ?? "ゲスト")

//-- ログアウト処理。Cognito signOut を実行し、ルートへリダイレクト（Authenticator がログイン画面を表示）
async function handleLogout() {
  await signOut()
  router.replace("/")
}
</script>

<style scoped>
/* ヘッダー全体。メインカラー背景、flex で左右配置 */
.app-header {
  background-color: var(--color-main);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

/* メニューリンク（h1 でセマンティックに） */
.header-menu-link {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 400 !important;
  letter-spacing: 0.05em;
}

.header-menu-link-anchor {
  color: white;
  font-weight: inherit;
  text-decoration: none;
  transition: opacity 0.2s;
}

.header-menu-link-anchor:hover {
  opacity: 0.9;
}

/* 右側エリア（ログイン名 + ログアウト） */
.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-login-text {
  font-size: 0.875rem;
  font-weight: 400;
  opacity: 0.9;
}

/* ログアウトボタン。半透明白でヘッダーに馴染む */
.btn-header-logout {
  background: rgb(255 255 255 / 0.1);
  border: 1px solid rgb(255 255 255 / 0.3);
  padding: 0.375rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 400;
  color: white;
  transition: background 0.2s;
}

.btn-header-logout:hover {
  background: rgb(255 255 255 / 0.2);
}
</style>
