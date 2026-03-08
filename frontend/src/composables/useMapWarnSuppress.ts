//-- MapLibre の SDF/non-SDF 混在ワーニングを抑制
//-- MapTiler POI（SDF）と吹き出し・ユーザー画像（non-SDF）の混在は MapLibre の既知の制約
let _origConsoleWarn: typeof console.warn = console.warn

export function installMapWarnSuppress(): void {
  _origConsoleWarn = console.warn
  console.warn = (...args: unknown[]) => {
    const msg = typeof args[0] === "string" ? args[0] : ""
    if (msg.includes("Cannot mix SDF and non-SDF")) return
    _origConsoleWarn.apply(console, args)
  }
}

export function uninstallMapWarnSuppress(): void {
  console.warn = _origConsoleWarn
}
