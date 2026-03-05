<script setup lang="ts">
/**
 * OrderDetail.vue
 * - 看板編集（仮）
 * - いまは遷移確認のための“仮ページ”
 * - ここが表示できれば router / import は正常
 */
import { RouterLink } from "vue-router"
</script>

<template>
  <main class="min-h-screen bg-[#e2e8f0] p-6">
    <div class="max-w-3xl mx-auto bg-white rounded-2xl card-shadow p-6">
      <h1 class="text-lg font-bold text-main">看板編集（WIP）</h1>

      <p class="mt-2 text-sm text-slate-500">
        いまは遷移確認用の仮ページです。ここが出れば router はOK。
      </p>

      <RouterLink to="/menu" class="inline-block mt-6 text-main hover:underline">
        ← メニューへ戻る
      </RouterLink>
    </div>
  </main>
</template>