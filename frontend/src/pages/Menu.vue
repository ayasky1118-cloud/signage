<template>
  <!--
    画面：メニュー
    元HTMLモックをVue化。class は維持し、<a> を <RouterLink> に置換。
    将来ログイン導線が入っても /menu を入口にしやすい構造。
  -->
  <main id="menu-page" class="max-w-3xl mx-auto py-10 px-6">
    <div class="bg-white rounded-2xl card-shadow border border-slate-200/80 overflow-hidden">
      <!-- カードヘッダー -->
      <div class="bg-main border-b border-slate-200 px-8 py-5">
        <h2 class="text-lg font-normal text-white">メニュー</h2>
      </div>

      <!-- カード本文：メニュー項目 -->
      <div class="p-8">
        <!-- メニュー項目一覧（各項目は RouterLink で SPA 遷移） -->
        <div class="flex flex-col gap-3">
          <!-- 注文一覧 → /order/list -->
          <RouterLink
            to="/order/list"
            class="group flex items-center w-full bg-main hover:bg-subBlue p-4 rounded-xl shadow-md shadow-main/10 transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <div class="bg-white/10 p-3 rounded-lg group-hover:bg-white/20 transition-colors">
              <!-- menu icon -->
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>

            <span class="flex-1 text-center text-lg font-normal text-white">注文一覧</span>

            <svg class="w-6 h-6 text-white/50 ml-auto group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </RouterLink>

          <!-- 注文（新規・変更） → /order/main -->
          <RouterLink
            to="/order/main"
            class="group flex items-center w-full bg-main hover:bg-subBlue p-4 rounded-xl shadow-md shadow-main/10 transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <div class="bg-white/10 p-3 rounded-lg group-hover:bg-white/20 transition-colors">
              <!-- pencil icon -->
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>

            <span class="flex-1 text-center text-lg font-normal text-white">注文（新規・変更）</span>

            <svg class="w-6 h-6 text-white/50 ml-auto group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </RouterLink>

          <!-- 看板編集 → /order/detail -->
          <RouterLink
            to="/order/detail"
            class="group flex items-center w-full bg-main hover:bg-subBlue p-4 rounded-xl shadow-md shadow-main/10 transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <div class="bg-white/10 p-3 rounded-lg group-hover:bg-white/20 transition-colors">
              <!-- pin icon -->
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            <span class="flex-1 text-center text-lg font-normal text-white">看板編集</span>

            <svg class="w-6 h-6 text-white/50 ml-auto group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </RouterLink>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
/**
 * Menu.vue
 * 注文・看板管理のトップメニュー画面。3つの操作（注文入力、看板入力、一覧）への導線を提供。
 *
 * 設計メモ:
 * - 元HTMLモックをVue Routerで動く形に移植。class は維持しデザインを崩さない。
 * - RouterLink はグローバル登録のため import 不要（Vite / plugin-vue のハマり防止）。
 * - 将来ログイン導線や認証チェックが入っても、このコンポーネントはほぼ変更不要な設計。
 */
</script>