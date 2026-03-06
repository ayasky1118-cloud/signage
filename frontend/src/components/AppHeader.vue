<template>
  <header id="app-header" class="bg-main text-white px-8 py-4 flex justify-between items-center shadow-md">
    <h1 class="header-menu-link text-xl font-bold tracking-wider">
      <RouterLink to="/menu" class="text-white hover:opacity-90 transition-opacity duration-200">
        メインメニュー
      </RouterLink>
    </h1>
    <div class="flex items-center gap-6">
      <span class="text-sm opacity-90">ログイン中: {{ loginName }}</span>
      <button
        type="button"
        class="bg-white/10 hover:bg-white/20 border border-white/30 px-4 py-1.5 rounded-xl text-sm transition-all duration-200"
        @click="handleLogout"
      >
        ログアウト
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * 共通ヘッダー
 *
 * - ログイン名・ログアウトボタンを表示
 * - 現段階はデフォルト値。将来 Cognito 導入時に差し替え
 */
import { ref, onMounted } from "vue"

const loginName = ref("ゲスト")

function handleLogout() {
  // 将来: Cognito の signOut を呼ぶ
  localStorage.removeItem("isAuthed")
  // デフォルトではリロードでメニューへ（認証ガード未実装のため）
  window.location.href = "/menu"
}

onMounted(() => {
  // 将来: localStorage や Cognito からユーザー名を取得
  const stored = localStorage.getItem("userName")
  if (stored) loginName.value = stored
})
</script>
