<script setup lang="ts">
//-- App.vue
//--
//-- アプリケーションのルートコンポーネント。main.ts でマウントされ、ルーティングされたページを表示する枠となる。
//-- AWS Cognito Authenticator でラップし、未ログイン時はログイン画面、ログイン後は DefaultLayout を表示。
//-- DefaultLayout 内で RouterView を配置し、/menu, /order/list 等のページを切り替える。
import { watch } from "vue"
import { useRoute } from "vue-router"
import { Authenticator } from "@aws-amplify/ui-vue"
import "@aws-amplify/ui-vue/styles.css"
import DefaultLayout from "./layouts/DefaultLayout.vue"

const route = useRoute()

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
  <!-- Authenticator: 未ログイン時は Cognito ログイン画面、ログイン後は DefaultLayout を表示。サインアップ（新規登録）も有効 -->
  <Authenticator>
    <template #default="{ user }">
      <DefaultLayout v-if="user" />
    </template>
  </Authenticator>
</template>