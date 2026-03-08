//-- main.ts - Vue アプリケーションのエントリーポイント
//--
//-- 【役割】
//-- ・Vue アプリの生成・マウント
//-- ・ルーター（Vue Router）の登録
//-- ・グローバル CSS の読み込み（shared → common。画面別は各ページで import）
//--
//-- 【起動フロー】
//-- 1. createApp(App) でルートコンポーネントを指定してアプリを生成
//-- 2. use(router) で Vue Router を有効化（/menu, /order/list 等のルート定義）
//-- 3. mount('#app') で index.html の #app 要素にマウント
import { createApp } from "vue"

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
