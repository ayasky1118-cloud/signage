<script setup lang="ts">
//-- App.vue
//--
//-- アプリケーションのルートコンポーネント。main.ts でマウントされ、ルーティングされたページを表示する枠となる。
//-- DefaultLayout 内で RouterView を配置し、/menu, /order/list 等のページを切り替える。
import { watch } from "vue"
import { useRoute } from "vue-router"
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
  <!-- DefaultLayout: AppHeader + RouterView。全ページ共通のヘッダーとコンテンツ領域 -->
  <DefaultLayout />
</template>