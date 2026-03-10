//-- main.ts - Vue アプリケーションのエントリーポイント
//--
//-- 【役割】
//-- ・Vue アプリの生成・マウント
//-- ・AWS Amplify（Cognito 認証）の設定
//-- ・ルーター（Vue Router）の登録
//-- ・グローバル CSS の読み込み（shared → common。画面別は各ページで import）
//--
//-- 【起動フロー】
//-- 1. Amplify.configure で Cognito を設定
//-- 2. createApp(App) でルートコンポーネントを指定してアプリを生成
//-- 3. use(router) で Vue Router を有効化（/menu, /order/list 等のルート定義）
//-- 4. mount('#app') で index.html の #app 要素にマウント
import { createApp } from "vue"
import { Amplify } from "aws-amplify"
import { I18n } from "aws-amplify/utils"

//-- AWS Cognito 認証の設定
//-- 環境変数 VITE_COGNITO_* で切り替え。未設定時は従来のテスト環境（sinage_old）の User Pool をフォールバック
const userPoolId =
  import.meta.env.VITE_COGNITO_USER_POOL_ID ?? "ap-northeast-1_YCSDgFpIR"
const userPoolClientId =
  import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID ?? "6oq9mimrhkujmgp42kcdbvggkb"

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
    },
  },
})

//-- 認証 UI の日本語化
I18n.putVocabularies({
  ja: {
    "Sign In": "ログイン",
    "Sign in": "ログイン",
    "Signing in": "ログイン中...",
    Username: "ユーザーID",
    Password: "パスワード",
    "Incorrect username or password.": "ユーザーID・パスワードが一致していません。",
    "Forgot your password?": "パスワードをお忘れの方",
    "Enter your Username": "ユーザーIDを入力してください",
    "Enter your username": "ユーザーID（メールアドレス）を入力してください",
    "Enter your Password": "パスワードを入力してください",
    "Change Password": "パスワード変更",
    "Please confirm your Password": "パスワードを入力してください",
    "Reset Password": "パスワード再設定",
    "Send code": "コードを送信する",
    "Code *": "再設定コード",
    Code: "再設定コード",
    "New Password": "新しいパスワード",
    "Confirm Password": "新しいパスワード（確認用）",
    "Back to Sign In": "ログインに戻る",
    "Create Account": "アカウント作成",
    "Create account": "アカウント作成",
    "Sign Up": "新規登録",
    "Sign up": "新規登録",
    "Signing up": "登録中...",
    "Confirm Sign Up": "登録確認",
    "Have an account? Sign in": "アカウントをお持ちの方",
    "Enter your Email": "メールアドレスを入力してください",
    "Enter your email": "メールアドレスを入力してください",
    "Enter your Phone Number": "電話番号を入力してください",
    "Enter your phone number": "電話番号を入力してください",
    "Enter your confirmation code": "確認コードを入力してください",
    "Resend Code": "コードを再送信",
  },
})
I18n.setLanguage("ja")

//-- MapLibre の「Cannot mix SDF and non-SDF icons」等のスタイル警告を抑制
//-- MapTiler（SDF）と吹き出し/ユーザー画像（non-SDF）の混在は既知の制約で、表示には影響しない
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  const msg = String(args[0] ?? "")
  if (msg.includes("SDF") && msg.includes("non-SDF")) return
  if (msg.includes("Style sheet warning")) return
  originalWarn.apply(console, args)
}

//-- グローバル CSS（読み込み順: shared → common）
import "./assets/styles/shared.css"
import "./assets/styles/common.css"

//-- ルートコンポーネント（App.vue: ヘッダー + RouterView）
import App from "./App.vue"
//-- Vue Router インスタンス（router/index.ts で定義）
import router from "./router"

//-- アプリを生成し、ルーターを登録して #app にマウント
createApp(App).use(router).mount("#app")
