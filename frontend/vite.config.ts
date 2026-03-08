//-- vite.config.ts
//--
//-- Vite のビルド・開発サーバー設定。
//-- composables の getApiBase が空のとき、フロントは /api にリクエストし、ここでバックエンドへプロキシされる。
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
  plugins: [vue()],
  build: {
    target: "esnext",  //-- モダンブラウザ向け。必要に応じて "es2020" 等に下げる
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  server: {
    proxy: {
      //-- /api で始まるリクエストをバックエンドへ転送。/api を除去して転送（例: /api/orders → http://localhost:8000/orders）
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
})