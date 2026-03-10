//-- useUnsavedChangesGuard - 未保存変更ガード
//--
//-- 【用途】
//-- ・各画面（OrderMain, OrderDetail 等）が未保存変更の有無を登録
//-- ・メインメニューリンク等の遷移時に、未保存があれば確認ダイアログを表示するために利用
//--
//-- 【使い方】
//-- ・画面の onMounted で register(hasChanges) を呼ぶ
//-- ・画面の onUnmounted で unregister() を呼ぶ
//-- ・AppHeader 等で hasUnsavedChanges() を呼び、true なら遷移前に確認ダイアログを表示
type HasChangesFn = () => boolean

let currentGuard: HasChangesFn | null = null

export function useUnsavedChangesGuard() {
  function register(hasChanges: HasChangesFn) {
    currentGuard = hasChanges
  }

  function unregister() {
    currentGuard = null
  }

  function hasUnsavedChanges(): boolean {
    return currentGuard?.() ?? false
  }

  return { register, unregister, hasUnsavedChanges }
}
