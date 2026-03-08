<script setup lang="ts">
/**
 * HtmlObjectValueSelectModal - HTMLオブジェクト値選択モーダル
 *
 * 【用途】
 * ・全画面編集（OrderDetail）のサイドバーで、ルート描画・テキスト配置・画像配置・吹き出し配置等の
 *   「選択」ボタン押下時に表示されるモーダル
 * ・html_object_value マスタの選択肢を画像＋名称で一覧表示し、ユーザーが1件を選択する
 *
 * 【表示内容】
 * ・各選択肢: サンプル画像（64x64px）＋ valueName（2行まで）
 * ・画像がない場合は「—」のプレースホルダーを表示
 *
 * 【親コンポーネントとの連携】
 * ・v-model で開閉を制御（modelValue: 表示フラグ）
 * ・select イベントで選択した HtmlObjectValueItem を親に渡す
 */
import type { HtmlObjectValueItem } from "../composables/useHtmlObjectApi"

// -----------------------------------------------------------------------------
// Props 定義
// -----------------------------------------------------------------------------

defineProps<{
  /** モーダルの表示/非表示。true で表示。v-model で双方向バインディング */
  modelValue: boolean
  /** モーダルヘッダーに表示するタイトル（例: 「ルートの種類」「吹き出しの形」）。末尾に「を選択」が付く */
  title: string
  /** 選択肢の一覧。html_object_value マスタの値（htmlObjectValueId, valueName, sampleImagePath 等） */
  items: HtmlObjectValueItem[]
}>()

// -----------------------------------------------------------------------------
// Emits 定義
// -----------------------------------------------------------------------------

const emit = defineEmits<{
  /** モーダルを閉じる際に false を発火。v-model の更新に使用 */
  "update:modelValue": [value: boolean]
  /** ユーザーが選択肢をクリックした際に、選択した HtmlObjectValueItem を発火 */
  select: [value: HtmlObjectValueItem]
}>()

// -----------------------------------------------------------------------------
// モーダル操作
// -----------------------------------------------------------------------------

/** モーダルを閉じる（オーバーレイクリック・キャンセルボタン・選択時いずれかで呼ばれる） */
function close() {
  emit("update:modelValue", false)
}

/** 選択肢をクリックしたときの処理。親に選択値を渡し、モーダルを閉じる */
function onSelect(v: HtmlObjectValueItem) {
  emit("select", v)
  close()
}
</script>

<template>
  <!-- body 直下にマウント（z-index や overflow の影響を避けるため Teleport 使用） -->
  <Teleport to="body">
    <div
      v-show="modelValue"
      class="modal html-object-value-modal"
      aria-hidden="false"
      role="dialog"
      aria-modal="true"
      aria-labelledby="htmlObjectValueSelectModalTitle"
    >
      <!-- オーバーレイ（半透明の黒）。クリックでモーダルを閉じる -->
      <div class="modal-overlay" @click="close"></div>
      <!-- モーダル本体を中央に配置 -->
      <div class="modal-dialog">
        <div class="modal-content modal-content--narrow">
          <!-- ヘッダー（メインカラー背景。「〇〇を選択」） -->
          <div class="modal-header">
            <h3 id="htmlObjectValueSelectModalTitle" class="modal-header-title">{{ title }}を選択</h3>
          </div>
          <!-- 選択肢一覧（2〜3列グリッド。最大高さ 60vh でスクロール可能） -->
          <div class="modal-body modal-body--scroll">
            <div class="html-object-value-grid">
              <button
                v-for="v in items"
                :key="v.htmlObjectValueId"
                type="button"
                class="html-object-value-item"
                @click="onSelect(v)"
              >
                <!-- サンプル画像（あれば表示。なければ「—」プレースホルダー） -->
                <img
                  v-if="v.sampleImagePath"
                  :src="v.sampleImagePath"
                  :alt="v.valueName"
                  class="html-object-value-img"
                />
                <div v-else class="html-object-value-placeholder">—</div>
                <span class="html-object-value-name line-clamp-2">{{ v.valueName }}</span>
              </button>
            </div>
            <!-- 選択肢が0件の場合のメッセージ -->
            <p v-if="items.length === 0" class="text-muted">選択肢がありません</p>
          </div>
          <!-- フッター（キャンセルボタンのみ） -->
          <div class="modal-footer modal-footer--end">
            <button
              type="button"
              class="btn btn-secondary btn-secondary--slate"
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
.html-object-value-modal {
  z-index: 60;
}

.modal-body--scroll {
  padding: 1.25rem 1.5rem;
  max-height: 60vh;
  overflow: auto;
}

.html-object-value-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .html-object-value-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.html-object-value-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  transition: all 0.2s;
  text-align: left;
}

.html-object-value-item:hover {
  border-color: var(--color-main);
  background-color: rgb(0 59 130 / 0.05);
}

.html-object-value-img {
  width: 4rem;
  height: 4rem;
  object-fit: contain;
  flex-shrink: 0;
}

.html-object-value-placeholder {
  width: 4rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(241 245 249);
  border-radius: 0.25rem;
  color: rgb(148 163 184);
  font-size: 0.625rem;
}

.html-object-value-name {
  font-size: 0.75rem;
  font-weight: 400;
  color: rgb(51 65 85);
  text-align: center;
}
</style>
