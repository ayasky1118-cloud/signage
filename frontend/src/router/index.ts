/**
 * router/index.ts
 *
 * ルーティング定義ファイル。
 *
 * ■ 現在の方針
 * - 将来的に AWS Cognito によるログインを導入する
 * - ただし現段階ではログイン画面は実装しない
 * - 設計だけ「認証前提」にしておく
 *
 * ■ 将来の差し替えポイント
 * - isAuthed() を Cognito セッション判定に置換
 * - beforeEach 内で未ログイン時に /login へリダイレクト
 */

import { createRouter, createWebHistory } from "vue-router"

/**
 * 仮の認証判定関数
 *
 * 現在は localStorage の値でログイン状態を判定する。
 * 将来 Cognito を導入した際は、
 * この関数を Cognito セッション判定ロジックへ差し替える。
 */
function isAuthed(): boolean {
  return localStorage.getItem("isAuthed") === "1"
}

/**
 * ルート定義
 *
 * meta.requiresAuth:
 *   true の場合、ログイン必須ページとして扱う。
 *   現段階ではブロックしないが、
 *   将来の認証ガード用に明示しておく。
 */
const router = createRouter({
  history: createWebHistory(),

  routes: [
    /**
     * ルート（/）
     *
     * 将来ログイン画面を設ける可能性があるため、
     * 直接 Menu にせず、/menu にリダイレクトしている。
     *
     * こうしておくことで、
     * 将来 / を /login に変更しても構造を壊さずに済む。
     */
    {
      path: "/",
      redirect: "/menu",
    },

    /**
     * メニュー画面（ログイン後トップ）
     */
    {
      path: "/menu",
      name: "menu",
      component: () => import("../pages/Menu.vue"),
      meta: { requiresAuth: true },
    },

    /**
     * 注文入力画面
     */
    {
      path: "/order/main",
      name: "order-main",
      component: () => import("../pages/OrderMain.vue"),
      meta: { requiresAuth: true },
    },

    /**
     * 看板入力画面
     */
    {
      path: "/order/detail",
      name: "order-detail",
      component: () => import("../pages/OrderDetail.vue"),
      meta: { requiresAuth: true },
    },

    /**
     * 注文一覧画面
     */
    {
      path: "/order/list",
      name: "order-list",
      component: () => import("../pages/OrderList.vue"),
      meta: { requiresAuth: true },
    },

    /**
     * 存在しないパスへのアクセス時
     *
     * 不明なURLにアクセスされた場合はメニューへ戻す。
     * 将来ログイン画面を導入する場合は、
     * ここも /login に変更する可能性がある。
     */
    {
      path: "/:pathMatch(.*)*",
      redirect: "/menu",
    },
  ],
})

/**
 * グローバルナビゲーションガード
 *
 * ここで認証チェックを行う。
 *
 * ■ 現在の挙動
 * - requiresAuth が true でもブロックしない（開発優先）
 *
 * ■ 将来の変更予定
 * - 未ログイン時は /login へリダイレクト
 */
router.beforeEach((to) => {
  // 認証が必要なページか判定
  if (to.meta.requiresAuth) {
    // 現在はブロックしない
    // 将来は以下のように変更予定：
    //
    // if (!isAuthed()) {
    //   return { path: "/login" }
    // }
    return true
  }

  return true
})

export default router