import { createApp } from 'vue'
/* グローバルCSS：Tailwind を先に読み、common.css を後に適用（入力欄のキャレット表示などで上書き） */
import "./style.css"
import "./assets/styles/common.css"
import App from "./App.vue"
import router from "./router"

createApp(App)
.use(router)
.mount('#app')
