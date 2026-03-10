<template>
  <!--
    未保存変更確認ダイアログ（共通）
    - OrderMain・OrderDetail・メインメニューリンク等で利用
    - shared.css の form-dialog 系クラスを使用
  -->
  <Teleport to="body">
    <div
      v-show="modelValue"
      class="form-dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="props.titleId"
      aria-hidden="false"
    >
      <div class="form-dialog-overlay" @click="handleCancel"></div>
      <div class="form-dialog-content form-dialog-content--wide">
        <div class="form-dialog-header">
          <h3 :id="props.titleId">変更の確認</h3>
        </div>
        <div class="form-dialog-body">
          <p>{{ message }}</p>
        </div>
        <div class="form-dialog-footer">
          <button type="button" class="btn btn-secondary" @click="handleCancel">
            {{ cancelLabel }}
          </button>
          <button
            v-if="showRegisterButton"
            type="button"
            class="btn btn-secondary btn-secondary--slate"
            @click="handleDiscard"
          >
            {{ discardLabel }}
          </button>
          <button
            :type="showRegisterButton ? 'button' : 'button'"
            :class="showRegisterButton ? 'btn btn-primary' : 'btn btn-secondary btn-secondary--slate'"
            @click="showRegisterButton ? handleRegister : handleDiscard"
          >
            {{ showRegisterButton ? registerLabel : discardLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
//-- UnsavedConfirmModal - 未保存変更確認ダイアログ（共通）
//--
//-- 【Props】
//-- ・modelValue: 表示/非表示
//-- ・message: メッセージ
//-- ・discardLabel: 破棄ボタンのラベル（例: 破棄する、破棄して戻る）
//-- ・cancelLabel: キャンセルボタンのラベル
//-- ・showRegisterButton: 登録ボタンを表示するか（OrderDetail の枝番切り替え等で使用）
//-- ・registerLabel: 登録ボタンのラベル（showRegisterButton 時のみ）
//--
//-- 【Events】
//-- ・update:modelValue: 閉じる時に false を emit
//-- ・cancel: キャンセルを選択（保留アクションのクリア等に使用）
//-- ・discard: 破棄を選択
//-- ・register: 登録を選択（showRegisterButton 時のみ）
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    message: string
    discardLabel?: string
    cancelLabel?: string
    showRegisterButton?: boolean
    registerLabel?: string
    titleId?: string
  }>(),
  {
    discardLabel: "破棄する",
    cancelLabel: "キャンセル",
    showRegisterButton: false,
    registerLabel: "登録してから",
    titleId: "unsavedConfirmModalTitle",
  }
)

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  cancel: []
  discard: []
  register: []
}>()


function handleCancel() {
  emit("update:modelValue", false)
  emit("cancel")
}

function handleDiscard() {
  emit("update:modelValue", false)
  emit("discard")
}

function handleRegister() {
  emit("update:modelValue", false)
  emit("register")
}
</script>
