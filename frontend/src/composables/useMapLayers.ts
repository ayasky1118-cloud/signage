//-- MapLibre GLのレイヤーとソースの初期設定を行うComposable
//-- ・テキストラベル用ソースとレイヤー
//-- ・画像アイコン用ソースとレイヤー
//-- ・吹き出し用ソースとレイヤー
//-- ・ルート用ソースとレイヤー
//-- ・ルート描画時の一時マーカー用ソースとレイヤー
//-- ・画像は html_object_value の sampleImagePath から loadMapImage で登録する
import type maplibregl from "maplibre-gl"
import type { FeatureCollection } from "geojson"

//-- 縞線用: ensureStripePatterns は不要（2レイヤー方式のためパターン画像不要）
//-- 互換のため export は残す（他から呼ばれている可能性）
export function ensureStripePatterns(
  _map: maplibregl.Map,
  _routeFeatures: FeatureCollection
): void {
  // 2レイヤー方式（白ベース + 選択色点線）で縞を実現。パターン画像は不要
}

//-- html_object_value の IMAGE_PLACEMENT から画像登録用の配列を生成する
//-- 利用例: initLayers(map, features, getImageItemsFromHtmlObjects(htmlObjects))
export function getImageItemsFromHtmlObjects(
  htmlObjects: Array<{
    categoryCode: string
    values: Array<{ valueCode: string; sampleImagePath: string | null }>
  }>
): { id: string; url: string }[] {
  const img = htmlObjects.find((o) => o.categoryCode === "IMAGE_PLACEMENT")
  if (!img?.values) return []
  return img.values
    .filter((v) => v.sampleImagePath?.trim())
    .map((v) => ({ id: v.valueCode, url: v.sampleImagePath!.trim() }))
}

export function useMapLayers() {
  //-- MapLibre に画像を登録する関数。非同期で画像をLoadし、MapLibreのスプライト領域にaddする
  const loadMapImage = async (
    map: maplibregl.Map,
    id: string,
    url: string
  ): Promise<void> => {
    if (map.hasImage(id)) return
    try {
      const response = await map.loadImage(url)
      map.addImage(id, response.data)
    } catch (e) {
      console.error(`画像の読み込みに失敗: ${id}`, e)
    }
  }

  //-- Mapのソースとレイヤー初期化を行う関数。FeatureCollectionをMapLibreのデータソースとして登録する
  //-- imageItems: html_object_value の IMAGE_PLACEMENT から getImageItemsFromHtmlObjects(htmlObjects) で取得
  const initLayers = async (
    map: maplibregl.Map,
    features: {
      routeFeatures: FeatureCollection
      imageFeatures: FeatureCollection
      balloonFeatures: FeatureCollection
      textFeatures: FeatureCollection
      tempMarkerFeatures: FeatureCollection
    },
    imageItems?: { id: string; url: string }[]
  ) => {
    //-- 線描画用のGeoJSONデータをソースとして追加。線描画レイヤーを追加（手順 10-2: properties の color/width/stripe で data-driven）
    map.addSource("route", { type: "geojson", data: features.routeFeatures, lineMetrics: true })
    //-- 単色（実線）: round で滑らか
    map.addLayer({
      id: "route-line-solid",
      type: "line",
      source: "route",
      filter: ["all", ["!=", ["get", "stripe"], true], ["!=", ["get", "style"], "dashed"]],
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#FF0000"],
        "line-width": ["coalesce", ["get", "width"], 4],
      },
    })
    ensureStripePatterns(map, features.routeFeatures)
    //-- 縞線: 2レイヤー方式で 選択色 白 選択色 白 を実現
    //-- line-pattern の白が透明になる問題を回避。下に白線、上に選択色の点線を重ねる
    map.addLayer({
      id: "route-line-stripe-base",
      type: "line",
      source: "route",
      filter: ["==", ["get", "stripe"], true],
      layout: { "line-join": "miter", "line-cap": "butt" },
      paint: {
        "line-color": "#FFFFFF",
        "line-width": ["coalesce", ["get", "width"], 4],
      },
    })
    map.addLayer({
      id: "route-line-stripe",
      type: "line",
      source: "route",
      filter: ["==", ["get", "stripe"], true],
      layout: { "line-join": "miter", "line-cap": "butt" },
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#FF0000"],
        "line-width": ["coalesce", ["get", "width"], 4],
        "line-dasharray": [2, 2],
      },
    })
    //-- 点線のみ: 縞線は route-line-stripe の line-pattern で描画。stripe を明示的に除外し余計な選択色線を防止
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      filter: ["all", ["==", ["get", "style"], "dashed"], ["!=", ["get", "stripe"], true]],
      layout: { "line-join": "miter", "line-cap": "butt" },
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#FF0000"],
        "line-width": ["coalesce", ["get", "width"], 4],
        "line-dasharray": [1, 1],
      },
    })

    //-- html_object_value の sampleImagePath から画像を登録する
    if (imageItems?.length) {
      for (const item of imageItems) {
        await loadMapImage(map, item.id, item.url)
      }
    }
    //-- 画像追加用のGeoJSONデータをソースとして追加
    map.addSource("images", { type: "geojson", data: features.imageFeatures })
    map.addLayer({
      id: "images",
      type: "symbol",
      source: "images",
      layout: {
        "icon-image": ["get", "imageId"],
        "icon-size": ["get", "scale"],
        "icon-rotate": ["get", "rotate"],
        "icon-allow-overlap": true,
      },
    })

    //-- 吹き出し画像（public/samples/balloon.png から sinage_old をコピー）
    await loadMapImage(map, "balloon-square", "/samples/balloon.png")
    //-- 吹き出し追加用のGeoJSONデータをソースとして追加。吹き出し配置レイヤーを追加
    map.addSource("balloons", { type: "geojson", data: features.balloonFeatures })
    map.addLayer({
      id: "balloons",
      type: "symbol",
      source: "balloons",
      layout: {
        "icon-image": ["get", "iconId"],
        "icon-size": ["get", "scale"],
        "text-field": ["get", "text"],
        "text-size": 14,
        "text-anchor": "center",
        "text-allow-overlap": true,
        "icon-allow-overlap": true,
      },
      paint: { "text-color": "#000" },
    })

    //-- テキスト追加用のGeoJSONデータをソースとして追加。テキスト配置レイヤーを追加
    map.addSource("texts", { type: "geojson", data: features.textFeatures })
    map.addLayer({
      id: "texts",
      type: "symbol",
      source: "texts",
      layout: { "text-field": ["get", "text"], "text-size": 14 },
      paint: {
        "text-color": "#000",
        "text-halo-color": "#fff",
        "text-halo-width": 2,
      },
    })

    //-- ルート描画時の一時マーカー追加用のGeoJSONデータをソースとして追加
    map.addSource("temp-markers", { type: "geojson", data: features.tempMarkerFeatures })
    map.addLayer({
      id: "temp-markers-layer",
      type: "circle",
      source: "temp-markers",
      paint: {
        "circle-radius": 6,
        "circle-color": "#FF0000",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
      },
    })
  }

  return {
    initLayers,
    loadMapImage,
    ensureStripePatterns,
  }
}
