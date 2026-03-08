//-- フォーム要素の id 定数（label for / input id の関連付け用）
//--
//-- 同一項目は画面間で同じ id を使用し、検索フォームは search- プレフィックスで区別する。
export const FORM_IDS = {
  //-- 検索フォーム（OrderList の主検索・詳細検索）
  search: {
    customer: "input-search-customer",
    manager: "input-search-manager",
    orderName: "input-search-order-name",
    designType: "input-search-design-type",
    orderNo: "input-search-order-no",
    address: "input-search-address",
    createdDateFrom: "input-search-created-date-from",
    createdDateTo: "input-search-created-date-to",
    status: "input-search-status",
    productionType: "input-search-production-type",
    deadline: "input-search-deadline",
    proofreading: "input-search-proofreading",
    note: "input-search-note",
  },
  //-- 注文フォーム（OrderMain）
  order: {
    orderNo: "input-order-order-no",
    companyCd: "input-order-company-cd",
    officeCd: "input-order-office-cd",
    siteCd: "input-order-site-cd",
    status: "input-order-status",
    productionType: "input-order-production-type",
    deadline: "input-order-deadline",
    proofreading: "input-order-proofreading",
    note: "input-order-note",
    orderName: "input-order-order-name",
    address: "input-order-address",
    customer: "input-order-customer",
    manager: "input-order-manager",
    designType: "input-order-design-type",
    template: "input-order-template",
    templateItem: (idx: number) => `input-order-template-item-${idx}`,
  },
  //-- 看板編集（OrderDetail）
  detail: {
    orderNo: "input-detail-order-no",
    branchNo: "input-detail-branch-no",
    branchNoAdd: "input-detail-branch-no-add",  //-- 枝番追加モーダル内
    note: "input-detail-note",
  },
} as const
