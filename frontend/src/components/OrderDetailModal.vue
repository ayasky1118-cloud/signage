<script setup lang="ts">
//-- OrderDetailModal - 注文詳細モーダル（読み取り専用）
//--
//-- 【用途】
//-- ・OrderList: 一覧の行をダブルクリックしたときに表示
//-- ・OrderDetail: 「注文詳細」ボタン押下時に表示
//-- ・注文一覧API（searchOrders）の返却値 OrderItem を表示する
//--
//-- 【表示内容】
//-- ・基本情報: 注文番号・注文名・住所・顧客名・担当者・デザイン種別・テンプレート
//-- ・社内情報: 社内CD・事業所CD・現場CD・制作区分・ステータス・納期・校正予定日
//-- ・備考（あれば）
//-- ・登録情報: 登録日・登録者・枝番
import type { OrderItem } from "../composables/useOrderApi"

//-------------------------------------------------------------------------------
//-- Props 定義
//-------------------------------------------------------------------------------

defineProps<{
  //-- モーダルの表示/非表示。v-model で双方向バインディング
  modelValue: boolean
  //-- 表示する注文データ。null の場合はモーダル本体を描画しない
  order: OrderItem | null
}>()

//-------------------------------------------------------------------------------
//-- Emits 定義
//-------------------------------------------------------------------------------

const emit = defineEmits<{
  //-- モーダルを閉じる際に false を発火
  "update:modelValue": [value: boolean]
}>()

//-------------------------------------------------------------------------------
//-- ヘルパー・モーダル操作
//-------------------------------------------------------------------------------

//-- 空・未定義の値を em dash（—）に変換する表示用ヘルパー
function orDash(val: string | undefined): string {
  return (val ?? "").trim() || "—"
}

//-- モーダルを閉じる（オーバーレイクリック・閉じるボタンで呼ばれる）
function close() {
  emit("update:modelValue", false)
}
</script>

<template>
  <!-- body 直下にマウント（z-index の影響を避けるため Teleport 使用） -->
  <Teleport to="body">
    <div
      v-show="modelValue"
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orderDetailModalTitle"
      aria-hidden="false"
    >
      <!-- オーバーレイ（半透明の黒）。クリックでモーダルを閉じる -->
      <div class="modal-overlay" @click="close"></div>
      <!-- モーダル外（コンテンツ外）クリックで閉じる -->
      <div class="modal-dialog order-detail-modal-dialog" @click="close">
        <div
          v-if="order"
          class="modal-content card-header-full order-detail-modal-content"
          @click.stop
        >
          <!-- ヘッダー（メインカラー背景） -->
          <div class="modal-header">
            <h3 id="orderDetailModalTitle" class="modal-header-title">注文詳細</h3>
          </div>
          <!-- 本文（最大高さ 85vh でスクロール可能） -->
          <div class="modal-body modal-body-detail">
            <!-- 基本情報: 注文番号・注文名・住所・顧客名・担当者・デザイン種別・テンプレート -->
            <section class="modal-section">
              <div class="section-title">
                <div class="section-title-accent"></div>
                <h3 class="section-title-text">基本情報</h3>
              </div>
              <dl class="modal-dl modal-dl--2col">
                <div class="modal-dl-item modal-dl-item--order-no">
                  <dt class="modal-dt">注文番号</dt>
                  <dd class="modal-dd modal-dd--order-no">{{ order.orderNo }}</dd>
                </div>
                <div class="modal-dl-item">
                  <dt class="modal-dt">注文名</dt>
                  <dd class="modal-dd">{{ orDash(order.orderName) }}</dd>
                </div>
                <div class="modal-dl-item modal-dl-item--full">
                  <dt class="modal-dt">住所</dt>
                  <dd class="modal-dd modal-dd--pre">{{ orDash(order.address) }}</dd>
                </div>
                <div class="modal-dl-item">
                  <dt class="modal-dt">顧客名</dt>
                  <dd class="modal-dd">{{ orDash(order.customerName) }}</dd>
                </div>
                <div class="modal-dl-item">
                  <dt class="modal-dt">担当者</dt>
                  <dd class="modal-dd">{{ orDash(order.manager) }}</dd>
                </div>
                <div class="modal-dl-item">
                  <dt class="modal-dt">デザイン種別</dt>
                  <dd class="modal-dd">{{ orDash(order.designType) }}</dd>
                </div>
                <div class="modal-dl-item">
                  <dt class="modal-dt">テンプレート</dt>
                  <dd class="modal-dd">{{ orDash(order.template) }}</dd>
                </div>
              </dl>
            </section>

            <!-- 社内情報: 社内CD・事業所CD・現場CD・制作区分・ステータス・納期・校正予定日 -->
            <section class="modal-section">
              <div class="section-title">
                <div class="section-title-accent"></div>
                <h3 class="section-title-text">社内情報</h3>
              </div>
              <dl class="modal-dl modal-dl--4col">
                <div class="modal-dl-item">
                  <dt class="modal-dt">社内CD</dt>
                  <dd class="modal-dd">{{ orDash(order.attribute_01) }}</dd>
                </div>
                <div class="modal-dl-item">
                  <dt class="modal-dt">事業所CD</dt>
                  <dd class="modal-dd">{{ orDash(order.attribute_02) }}</dd>
                </div>
                <div class="modal-dl-item">
                  <dt class="modal-dt">現場CD</dt>
                  <dd class="modal-dd">{{ orDash(order.attribute_03) }}</dd>
                </div>
                <div class="modal-dl-item"></div>
                <div class="modal-dl-item">
                  <dt class="modal-dt">制作区分</dt>
                  <dd class="modal-dd">{{ orDash(order.attribute_04) }}</dd>
                </div>
                <div class="modal-dl-item">
                  <dt class="modal-dt">ステータス</dt>
                  <dd class="modal-dd">{{ orDash(order.attribute_05) }}</dd>
                </div>
                <div class="modal-dl-item">
                  <dt class="modal-dt">納期</dt>
                  <dd class="modal-dd">{{ orDash(order.deadlineDt) }}</dd>
                </div>
                <div class="modal-dl-item">
                  <dt class="modal-dt">校正予定日</dt>
                  <dd class="modal-dd">{{ orDash(order.proofreadingDt) }}</dd>
                </div>
              </dl>
            </section>

            <!-- 備考（order.note が空でない場合のみ表示） -->
            <section v-if="order.note?.trim()" class="modal-section">
              <div class="section-title">
                <div class="section-title-accent"></div>
                <h3 class="section-title-text">備考</h3>
              </div>
              <div class="modal-note-box">{{ order.note }}</div>
            </section>

            <!-- 登録情報: 登録日・登録者・枝番 -->
            <section class="modal-section modal-section--border">
              <dl class="modal-dl modal-dl--2col">
                <div class="modal-dl-item">
                  <dt class="modal-dt">登録日</dt>
                  <dd class="modal-dd modal-dd--muted">{{ orDash(order.createdDate) }}</dd>
                </div>
                <div class="modal-dl-item">
                  <dt class="modal-dt">登録者</dt>
                  <dd class="modal-dd modal-dd--muted">{{ orDash(order.creator) }}</dd>
                </div>
                <div v-if="order.branches?.length" class="modal-dl-item modal-dl-item--full">
                  <dt class="modal-dt">枝番</dt>
                  <dd class="modal-dd modal-dd--muted">{{ order.branches.join(", ") }}</dd>
                </div>
              </dl>
            </section>
          </div>
          <!-- フッター（閉じるボタン） -->
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="close"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-body-detail {
  padding: 1.5rem 1.5rem 2.5rem;
}

@media (min-width: 768px) {
  .modal-body-detail {
    padding: 2rem 2rem 2.5rem;
  }
}

.modal-section {
  margin-bottom: 1.5rem;
}

.modal-section:last-child {
  margin-bottom: 0;
}

.modal-section--border {
  padding-top: 1rem;
  border-top: 1px solid rgb(226 232 240);
}

.modal-dl {
  display: grid;
  gap: 1rem;
}

.modal-dl--2col {
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem 2rem;
}

.modal-dl--4col {
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem 1.5rem;
}

@media (min-width: 640px) {
  .modal-dl--2col {
    grid-template-columns: 1fr 1fr;
  }
}

.modal-dl-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.modal-dl-item--full {
  grid-column: 1 / -1;
}

@media (min-width: 640px) {
  .modal-dl-item--full {
    grid-column: span 2;
  }
}

.modal-dt {
  margin: 0;
  font-size: 0.625rem;
  font-weight: 400;
  color: rgb(148 163 184);
}

.modal-dd {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(51 65 85);
  text-align: left;
}

.modal-dd--pre {
  white-space: pre-wrap;
}

.modal-dd--muted {
  color: rgb(71 85 105);
}

.modal-dl-item--order-no .modal-dd--order-no {
  width: var(--order-no-width);
  min-width: var(--order-no-width);
}

.modal-note-box {
  font-size: 0.75rem;
  color: rgb(51 65 85);
  white-space: pre-wrap;
  background-color: rgb(248 250 252);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid rgb(226 232 240);
}

.order-detail-modal-dialog {
  overflow-y: auto;
}

.order-detail-modal-content {
  margin-top: 2rem;
  margin-bottom: 2rem;
}
</style>
