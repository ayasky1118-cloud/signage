//-- MapLibre の SDF/non-SDF 混在ワーニングを抑制するユーティリティ
//--
//-- 【背景】
//-- MapTiler POI（SDF）と吹き出し・ユーザー画像（non-SDF）の混在は MapLibre の既知の制約。
//-- コンソールに "Cannot mix SDF and non-SDF" が大量に出力されるため、該当ワーニングのみ抑制する。
//--
//-- 【呼び出しタイミング】
//-- ・installMapWarnSuppress: MapLibre の map を生成する前に呼ぶ（例: App.vue の onMounted、または地図コンポーネントの setup の先頭）
//-- ・uninstallMapWarnSuppress: 地図を破棄した後、またはアプリ終了時に呼ぶ（console.warn を元に戻す）
let _origConsoleWarn: typeof console.warn = console.warn

export function installMapWarnSuppress(): void {
  _origConsoleWarn = console.warn
  //-- "Cannot mix SDF and non-SDF" を含むメッセージのみ握りつぶす。それ以外は従来通り console.warn に出力
  console.warn = (...args: unknown[]) => {
    const msg = typeof args[0] === "string" ? args[0] : ""
    if (msg.includes("Cannot mix SDF and non-SDF")) return
    _origConsoleWarn.apply(console, args)
  }
}

export function uninstallMapWarnSuppress(): void {
  console.warn = _origConsoleWarn
}
