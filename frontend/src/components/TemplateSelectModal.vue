<script setup lang="ts">
//-- TemplateSelectModal - テンプレート選択モーダル
//--
//-- 【用途】
//-- ・OrderMain: 注文登録フォームの「テンプレート」選択時に表示
//-- ・companyId と customerId を条件に API でテンプレート一覧を取得し、カードグリッドで表示
//--
//-- 【表示内容】
//-- ・各テンプレート: サンプル画像（256px 高さ）＋ templateName
//-- ・2〜5列のグリッド（レスポンシブ）
//--
//-- 【データ取得】
//-- ・モーダルが開いたとき（modelValue が true になったとき）に loadTemplates を実行
//-- ・companyId または customerId が変更されたときも再取得
import { ref, watch } from "vue"
import { fetchTemplates, type TemplateOption } from "../composables/useTemplateApi"

//-------------------------------------------------------------------------------
//-- Props 定義
//-------------------------------------------------------------------------------

const props = defineProps<{
  modelValue: boolean  //-- モーダルの表示/非表示。v-model で双方向バインディング
  companyId: number  //-- ログイン会社ID（必須）。この会社に紐づくテンプレートを取得
  customerId?: number | null  //-- 顧客ID。指定時は当該顧客に紐づくテンプレートのみ取得（未指定時は会社の全テンプレート）
}>()

//-------------------------------------------------------------------------------
//-- Emits 定義
//-------------------------------------------------------------------------------

const emit = defineEmits<{
  "update:modelValue": [value: boolean]  //-- モーダルを閉じる際に false を発火
  select: [option: TemplateOption]  //-- ユーザーがカードをクリックした際に、選択した TemplateOption を発火
}>()

//-------------------------------------------------------------------------------
//-- 状態・データ取得
//-------------------------------------------------------------------------------

//-- モーダルに表示するテンプレート一覧。loadTemplates で API から取得
const items = ref<TemplateOption[]>([])
//-- テンプレート一覧取得中のローディング状態
const loading = ref(false)

//-- companyId と customerId を条件にテンプレート一覧を API 取得。エラー時は空配列
async function loadTemplates() {
  loading.value = true
  try {
    items.value = await fetchTemplates(props.companyId, props.customerId ?? undefined)
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

//-- モーダルが開いたとき（modelValue が true）に loadTemplates を実行。
//-- companyId / customerId が変更されたときも open が true なら再取得
watch(
  () => [props.modelValue, props.companyId, props.customerId] as const,
  ([open]) => {
    if (open) loadTemplates()
  }
)

//-------------------------------------------------------------------------------
//-- モーダル操作
//-------------------------------------------------------------------------------

//-- モーダルを閉じる（オーバーレイクリック・キャンセルボタン・選択時で呼ばれる）
function close() {
  emit("update:modelValue", false)
}

//-- テンプレートカードをクリックしたときの処理。親に選択値を渡し、モーダルを閉じる
function onSelect(opt: TemplateOption) {
  emit("select", opt)
  close()
}
</script>

<template>
  <!-- Teleport to="body": モーダルを body 直下にマウント。親の z-index / overflow の影響を避ける -->
  <Teleport to="body">
    <div
      v-show="modelValue"
      class="modal"
      aria-hidden="false"
      role="dialog"
      aria-modal="true"
      aria-labelledby="templateSelectModalTitle"
    >
      <!-- オーバーレイ（半透明の黒）。クリックでモーダルを閉じる -->
      <div class="modal-overlay" @click="close"></div>
      <div class="modal-dialog" @click="close">
        <div
          class="modal-content modal-content--wide select-modal template-select-modal-content"
          @click.stop
        >
          <!-- ヘッダー（メインカラー背景） -->
          <div class="modal-header template-select-modal-header">
            <h3 id="templateSelectModalTitle" class="modal-header-title">テンプレートを選択</h3>
          </div>
          <!-- 本文: テンプレートカードグリッド。2列（SP）/ 5列（640px以上）。flex でヘッダー・本文・フッターを縦配置 -->
          <div class="modal-body template-select-modal-body">
            <p v-if="loading" class="text-muted">読み込み中...</p>
            <div v-else class="template-select-grid">
              <!-- 各テンプレートをカード表示。サンプル画像はダミー（template-dummy.png）を共通表示 -->
              <button
                v-for="opt in items"
                :key="opt.templateId"
                type="button"
                class="template-select-item"
                @click="onSelect(opt)"
              >
                <div class="template-select-item-image">
                  <img
                    src="/samples/template/template-dummy.png?v=2"
                    :alt="opt.templateName"
                    class="template-select-item-img"
                  />
                </div>
                <div class="template-select-item-label">{{ opt.templateName }}</div>
              </button>
            </div>
            <p v-if="!loading && items.length === 0" class="text-muted">データがありません</p>
          </div>
          <!-- フッター（キャンセルボタン） -->
          <div class="modal-footer modal-footer--end template-select-modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="close"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* モーダル本体。max-height: 95vh で画面内に収め、flex で縦方向レイアウト */
.template-select-modal-content {
  max-height: 95vh;
  display: flex;
  flex-direction: column;
}

.template-select-modal-header {
  flex-shrink: 0;
}

.template-select-modal-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 1.5rem 2rem;
}

.template-select-modal-footer {
  flex-shrink: 0;
}

/* カードグリッド。SP: 2列、640px以上: 5列 */
.template-select-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (min-width: 640px) {
  .template-select-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

/* カード1枚。shared.css の .template-select-item と同様。ホバーでメインカラー枠 */
.template-select-item {
  display: flex;
  flex-direction: column;
  border-radius: 0.75rem;
  border: 2px solid rgb(226 232 240);
  background: white;
  overflow: hidden;
  text-align: left;
  transition: all 0.2s;
}

.template-select-item:hover,
.template-select-item:focus {
  box-shadow: 0 0 0 2px var(--color-main);
  outline: none;
}

.template-select-item-image {
  height: 16rem;
  width: 100%;
  background-color: rgb(241 245 249);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.template-select-item-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.template-select-item-label {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 400;
  color: rgb(51 65 85);
}
</style>
