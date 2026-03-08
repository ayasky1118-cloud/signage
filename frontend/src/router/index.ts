//-- router/index.ts
//--
//-- ルーティング定義ファイル。
//--
//-- ■ 現在の方針
//-- - 将来的に AWS Cognito によるログインを導入する
//-- - ただし現段階ではログイン画面は実装しない
//-- - 設計だけ「認証前提」にしておく
//--
//-- ■ 将来の差し替えポイント
//-- - isAuthed() を Cognito セッション判定に置換
//-- - beforeEach 内で未ログイン時に /login へリダイレクト
import { createRouter, createWebHistory } from "vue-router"

//-------------------------------------------------------------------------------
//-- 認証判定
//-------------------------------------------------------------------------------

//-- 仮の認証判定関数。localStorage の "isAuthed" が "1" ならログイン済みとみなす。
//-- 将来 Cognito 導入時は、この関数を Cognito セッション判定ロジックへ差し替える。
function isAuthed(): boolean {
  return localStorage.getItem("isAuthed") === "1"
}

//-------------------------------------------------------------------------------
//-- ルート定義
//-------------------------------------------------------------------------------

//-- createWebHistory: HTML5 History モード。URL に # なし（例: /order/list）。
//-- meta.requiresAuth: true のルートは認証必須。現段階ではブロックしないが、将来の認証ガード用に明示。
const router = createRouter({
  history: createWebHistory(),

  routes: [
    //-- ルート（/）。トップは /menu へリダイレクト。将来 /login を設ける場合、ここを /login に変更するだけで対応可能
    {
      path: "/",
      redirect: "/menu",
    },

    //-- メニュー画面。ログイン後トップ。3つの操作（注文一覧・注文登録・看板編集）への導線
    {
      path: "/menu",
      name: "menu",
      component: () => import("../pages/Menu.vue"),  //-- 遅延読込でコード分割（他ルートも同様）
      meta: { requiresAuth: true },
    },

    //-- 注文（新規・変更）画面。クエリ orderNo で一覧から遷移時は変更モードで表示
    {
      path: "/order/main",
      name: "order-main",
      component: () => import("../pages/OrderMain.vue"),
      meta: { requiresAuth: true },
    },

    //-- 看板編集画面。地図上でルート・テキスト・画像・吹き出しを配置。クエリ orderNo, itemCode, mode=edit で一覧から遷移
    {
      path: "/order/detail",
      name: "order-detail",
      component: () => import("../pages/OrderDetail.vue"),
      meta: { requiresAuth: true },
    },

    //-- 注文一覧画面。検索・ソート・ページネーション。行ダブルクリックで詳細モーダル、枝番クリックで看板編集へ
    {
      path: "/order/list",
      name: "order-list",
      component: () => import("../pages/OrderList.vue"),
      meta: { requiresAuth: true },
    },

    //-- 404 相当。存在しないパスはすべて /menu へリダイレクト。将来 /login 導入時はここも変更の可能性あり
    {
      path: "/:pathMatch(.*)*",
      redirect: "/menu",
    },
  ],
})

//-------------------------------------------------------------------------------
//-- グローバルナビゲーションガード
//-------------------------------------------------------------------------------

//-- 全ルート遷移前に実行。認証が必要なページ（meta.requiresAuth）へのアクセスを制御する。
//-- ■ 現在: requiresAuth が true でもブロックしない（開発・デモ優先）
//-- ■ 将来: 未ログイン時は /login へリダイレクト
router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    //-- 将来の認証ガード。isAuthed() が false なら /login へ
    // if (!isAuthed()) {
    //   return { path: "/login" }
    // }
    return true
  }
  return true
})

export default router