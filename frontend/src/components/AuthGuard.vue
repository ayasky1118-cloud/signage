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

onMounted(async () => {
  status.value = "checking"
  try {
    const { userId } = await getCurrentUser()
    if (!userId) {
      status.value = "denied"
      await props.signOut()
      return
    }
    const masterUser = await fetchUserByAuthUid(userId)
    if (masterUser) {
      status.value = "allowed"
    } else {
      status.value = "denied"
      await props.signOut()
    }
  } catch {
    status.value = "denied"
    await props.signOut()
  }
})
</script>

<template>
  <div v-if="status === 'checking'" class="auth-guard-checking">
    ログイン確認中...
  </div>
  <div v-else-if="status === 'denied'" class="auth-guard-denied">
    <p class="auth-guard-denied-message">ログインできません</p>
    <p class="auth-guard-denied-sub">ユーザーマスタに登録されていません。管理者にお問い合わせください。</p>
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
</style>
