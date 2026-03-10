<template>
  <!--
    共通ヘッダー（全ページ共通）
    - 左: メインメニュー（/menu）へのリンク
    - 右: ログインメールアドレス表示 + ログアウトボタン
    - App.vue で全ルートに配置
    - メインメニュークリック時、未保存変更があれば確認ダイアログを表示
  -->
  <header id="app-header" class="app-header">
    <!-- 左: メインメニューへのリンク（/menu） -->
    <h1 class="header-menu-link">
      <a
        href="/menu"
        class="header-menu-link-anchor"
        @click.prevent="handleMenuClick"
      >
        メインメニュー
      </a>
    </h1>
    <!-- 右: ログインメールアドレス表示・ログアウトボタン -->
    <div class="header-right">
      <span class="header-login-text">ログイン中: {{ loginEmail || "ゲスト" }}</span>
      <button
        type="button"
        class="btn btn-header-logout"
        @click="handleLogout"
      >
        ログアウト
      </button>
    </div>
  </header>

  <!-- メインメニュー遷移時の未保存変更確認ダイアログ -->
  <UnsavedConfirmModal
    v-model="menuUnsavedConfirmOpen"
    message="入力内容に変更があります。変更は破棄されます。メインメニューへ移動してよろしいですか"
    discard-label="破棄して移動する"
    cancel-label="キャンセル"
    @discard="navigateToMenu"
  />
</template>

<script setup lang="ts">
//-- AppHeader - 共通ヘッダー
//--
//-- 【用途】
//-- ・全ページ共通で表示されるヘッダー
//-- ・メインメニュー（/menu）へのリンク、ログインメールアドレス表示、ログアウトボタンを配置
//--
//-- 【認証】
//-- ・AWS Cognito（Amplify Authenticator）の useAuthenticator でユーザー情報と signOut を取得
//-- ・ログアウト時は signOut を実行し、Authenticator がログイン画面を表示
import { ref, watch } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useAuthenticator } from "@aws-amplify/ui-vue"
import { fetchUserAttributes } from "aws-amplify/auth"
import { useUnsavedChangesGuard } from "../composables/useUnsavedChangesGuard"
import UnsavedConfirmModal from "./UnsavedConfirmModal.vue"

//-------------------------------------------------------------------------------
//-- 状態・処理
//-------------------------------------------------------------------------------

const router = useRouter()
const route = useRoute()
const { hasUnsavedChanges } = useUnsavedChangesGuard()

const menuUnsavedConfirmOpen = ref(false)

//-- メインメニューリンククリック時。未保存変更があれば確認ダイアログを表示
function handleMenuClick() {
  if (route.path === "/menu") return
  if (hasUnsavedChanges()) {
    menuUnsavedConfirmOpen.value = true
  } else {
    router.push("/menu")
  }
}

function navigateToMenu() {
  router.push("/menu")
}
const { user, signOut } = useAuthenticator()

//-- ヘッダーに表示するログインメールアドレス。Cognito の fetchUserAttributes で取得
const loginEmail = ref<string>("")

watch(
  user,
  async (u) => {
    if (!u) {
      loginEmail.value = ""
      return
    }
    try {
      const attrs = await fetchUserAttributes()
      loginEmail.value = attrs.email ?? u.signInDetails?.loginId ?? ""
    } catch {
      // signInDetails.loginId をフォールバック（メールログイン時はここにメールが入る場合あり）
      loginEmail.value = u.signInDetails?.loginId ?? ""
    }
  },
  { immediate: true }
)

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

/* 右側エリア（ログインメールアドレス + ログアウト） */
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
