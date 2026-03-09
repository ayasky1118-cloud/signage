<script setup lang="ts">
//-- App.vue
//--
//-- アプリケーションのルートコンポーネント。main.ts でマウントされ、ルーティングされたページを表示する枠となる。
//-- AWS Cognito Authenticator でラップし、未ログイン時はログイン画面、ログイン後は AuthGuard で user マスタ突合。
//-- マスタに存在すれば DefaultLayout（RouterView）を表示、存在しなければ「ログインできません」。
import { watch } from "vue"
import { useRoute } from "vue-router"
import { Authenticator } from "@aws-amplify/ui-vue"
import "@aws-amplify/ui-vue/styles.css"
import AuthGuard from "./components/AuthGuard.vue"

const route = useRoute()

//-- アカウント作成タブの表示制御。true で非表示、false で表示
const hideSignUp = true  // true に変更すると「アカウント作成」タブを非表示

//-------------------------------------------------------------------------------
//-- ルート遷移時の副作用
//-------------------------------------------------------------------------------

//-- ルート遷移時に body の overflow をリセットする。
//-- 看板編集画面の全画面編集オーバーレイで overflow: hidden を付与するため、
//-- ページ遷移後も hidden が残るとスクロールできなくなる。それを防ぐ。
watch(
  () => route.path,
  () => {
    document.body.style.overflow = ""
  },
  { immediate: true }  //-- 初回マウント時も実行（他ページから戻った場合の対策）
)
</script>

<template>
  <!-- Authenticator: 未ログイン時は Cognito ログイン画面、ログイン後は AuthGuard で user マスタ突合。マスタに無ければ「ログインできません」 -->
  <Authenticator :hide-sign-up="hideSignUp">
    <template #default="{ user, signOut }">
      <AuthGuard v-if="user" :sign-out="signOut" />
    </template>
  </Authenticator>
</template>