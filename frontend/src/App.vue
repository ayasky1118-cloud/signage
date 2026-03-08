<script setup lang="ts">
//-- App.vue
//-- アプリケーションのルートコンポーネント。ルーティングされたページを表示するための枠となる。
import { watch } from "vue"
import { useRoute } from "vue-router"
import DefaultLayout from "./layouts/DefaultLayout.vue"

const route = useRoute()

//-- ルート遷移時に body の overflow をリセット（全画面編集等で hidden が残るのを防ぐ）
watch(
  () => route.path,
  () => {
    document.body.style.overflow = ""
  },
  { immediate: true }
)
</script>

<template>
  <DefaultLayout />
</template>