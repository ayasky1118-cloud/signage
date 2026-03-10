<script setup lang="ts">
//-- AuthGuard - ログイン後の user マスタ突合
//--
//-- Cognito ログイン成功後、auth_uid（sub）で user マスタを検索する。
//-- マスタに存在しない場合は signOut して「ログインできません」を表示。
import { ref, onMounted } from "vue"
import { getCurrentUser } from "aws-amplify/auth"
import { fetchUserByAuthUid } from "../composables/useUserApi"
import DefaultLayout from "../layouts/DefaultLayout.vue"

const props = defineProps<{
  signOut: () => Promise<void>
}>()

//-- 突合結果: checking | allowed | denied
const status = ref<"checking" | "allowed" | "denied">("checking")
//-- denied 時に表示する Cognito sub（auth_uid 設定用）
const deniedAuthUid = ref<string>("")

onMounted(async () => {
  status.value = "checking"
  let authUidForDenied = ""
  try {
    const { userId } = await getCurrentUser()
    if (!userId) {
      status.value = "denied"
      deniedAuthUid.value = "（取得できませんでした）"
      await delayThenSignOut()
      return
    }
    authUidForDenied = userId
    const masterUser = await fetchUserByAuthUid(userId)
    if (masterUser) {
      status.value = "allowed"
    } else {
      status.value = "denied"
      deniedAuthUid.value = userId
      await delayThenSignOut()
    }
  } catch (e) {
    status.value = "denied"
    deniedAuthUid.value = authUidForDenied || "（API エラー: バックエンドの起動を確認してください）"
    console.error("AuthGuard:", e)
    await delayThenSignOut()
  }
})

//-- 「ログインできません」を表示してから signOut（ユーザーがメッセージを読めるように）
async function delayThenSignOut() {
  await new Promise((r) => setTimeout(r, 3000))
  await props.signOut()
}
</script>

<template>
  <div v-if="status === 'checking'" class="auth-guard-checking">
    ログイン確認中...
  </div>
  <div v-else-if="status === 'denied'" class="auth-guard-denied">
    <p class="auth-guard-denied-message">ログインできません</p>
    <p class="auth-guard-denied-sub">ユーザーマスタに登録されていません。管理者にお問い合わせください。</p>
    <p v-if="deniedAuthUid" class="auth-guard-denied-hint">
      ローカル開発時: user テーブルの auth_uid を以下に更新してください。<br>
      <code>{{ deniedAuthUid }}</code>
    </p>
    <p class="auth-guard-denied-timer">3秒後にログイン画面に戻ります...</p>
  </div>
  <DefaultLayout v-else />
</template>

<style scoped>
.auth-guard-checking,
.auth-guard-denied {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--page-bg-color);
  color: rgb(71 85 105);
  padding: 2rem;
}

.auth-guard-denied {
  gap: 0.5rem;
}

.auth-guard-denied-message {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-main);
}

.auth-guard-denied-sub {
  margin: 0;
  font-size: 0.875rem;
  color: rgb(100 116 139);
}

.auth-guard-denied-hint {
  margin: 1rem 0 0;
  font-size: 0.75rem;
  color: rgb(100 116 139);
  text-align: left;
  max-width: 32rem;
}

.auth-guard-denied-hint code {
  display: block;
  margin-top: 0.25rem;
  padding: 0.5rem;
  background: rgb(241 245 249);
  border-radius: 4px;
  font-size: 0.7rem;
  word-break: break-all;
}

.auth-guard-denied-timer {
  margin: 1rem 0 0;
  font-size: 0.75rem;
  color: rgb(148 163 184);
}
</style>
