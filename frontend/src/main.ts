import { createApp } from 'vue'
/* グローバルCSS：common.css を先に読み、その後に Tailwind（style.css）を適用 */
import "./assets/styles/common.css"
import "./style.css"
import App from "./App.vue"
import router from "./router"

createApp(App)
.use(router)
.mount('#app')
