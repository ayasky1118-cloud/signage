//-- router/index.ts
//--
//-- ルーティング定義ファイル。
//--
//-- ■ 認証
//-- - AWS Cognito（Amplify Authenticator）でログイン画面を表示
//-- - requiresAuth のルートへアクセス時、Cognito セッションを確認し未ログインなら / へリダイレクト
//-- - Authenticator が / でログイン画面を表示するため、実質的にログイン必須となる
import { createRouter, createWebHistory } from "vue-router"
import { getCurrentUser } from "aws-amplify/auth"

//-------------------------------------------------------------------------------
//-- 認証判定
//-------------------------------------------------------------------------------

//-- Cognito セッション判定。getCurrentUser が成功すればログイン済み
async function isAuthed(): Promise<boolean> {
  try {
    await getCurrentUser()
    return true
  } catch {
    return false
  }
}

//-------------------------------------------------------------------------------
//-- ルート定義
//-------------------------------------------------------------------------------

//-- createWebHistory: HTML5 History モード。URL に # なし（例: /order/list）。
//-- meta.requiresAuth: true のルートは認証必須。現段階ではブロックしないが、将来の認証ガード用に明示。
const router = createRouter({
  history: createWebHistory(),

  routes: [
    //-- ルート（/）。認証不要（未ログイン時は Authenticator がログイン画面を表示）。認証済みなら Menu を表示
    {
      path: "/",
      name: "root",
      component: () => import("../pages/Menu.vue"),
      meta: { requiresAuth: false },
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

    //-- 404 相当。存在しないパスはすべて / へリダイレクト（未認証時は Authenticator がログイン画面を表示）
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
})

//-------------------------------------------------------------------------------
//-- グローバルナビゲーションガード
//-------------------------------------------------------------------------------

//-- 全ルート遷移前に実行。認証が必要なページ（meta.requiresAuth）へのアクセスを制御する。
//-- 未ログイン時は / へリダイレクト（Authenticator がログイン画面を表示）
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const authed = await isAuthed()
    if (!authed) {
      return { path: "/" }
    }
  }
  return true
})

export default router