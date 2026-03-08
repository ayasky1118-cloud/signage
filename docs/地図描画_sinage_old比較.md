# 地図描画 sinage_old との比較・取込漏れ確認

sinage_old で線が引けていた実装と signage の実装を比較し、取込漏れを確認した結果です。

---

## 1. 構造の違い

| 項目 | sinage_old | signage |
|------|------------|--------|
| 地図コンポーネント | MapCustomComponent（地図＋コントロール同一） | MapPreview（地図）＋ OrderDetail（コントロール） |
| マップ作成タイミング | コンポーネントマウント時（地図は常に表示） | 全画面編集オープン時（v-if で MapPreview マウント） |
| クリックハンドラ | setupClickHandler(map) を map.on('load') 内で呼ぶ | MapPreview が map.on('click') で emit、OrderDetail が @map-click で受信 |
| マップコンテナ | 常に表示（800x800）、マウント時からサイズ確定 | 全画面オーバーレイ内、flex レイアウトでサイズ決定 |

---

## 2. 取込済みの項目

- [x] useMapFeatures（addTempMarker, drawRoute, tempCoordinates, tempMarkerFeatures）
- [x] useMapLayers（route, temp-markers ソース・レイヤー）
- [x] useMapInteraction（editMode, setupClickHandler のロジック）
- [x] クリック時の addTempMarker 呼び出し
- [x] 確定ボタンでの drawRoute 呼び出し
- [x] map.on('load') 内での initLayers → クリックハンドラ登録の順序

---

## 3. 取込漏れ・差分と対応

### 3.1 マップ作成タイミングとコンテナサイズ

**sinage_old**: マウント時に地図を作成。コンテナは常に表示（800x800）のため、作成時点でサイズが確定している。

**signage**: 全画面オープン時に MapPreview をマウント。flex レイアウトのため、マップロード直後はレイアウトが未確定の可能性がある。

**対応**: `onFullscreenMapLoaded` 内で `nextTick` 後に `fitMapToContainer()` を呼び、マップロード完了後にリサイズする。

### 3.2 クリックハンドラの登録方法

**sinage_old**: 同一コンポーネント内で `setupClickHandler(map, handlers)` を呼び、`map.on('click')` で handlers.onRoute を実行。

**signage**: MapPreview で `map.on('click')` を登録し、`emit('map-click', lngLat)` で親に通知。OrderDetail の `onFullscreenMapClick` で `addTempMarker` を呼ぶ。

**対応**: 既に map-click emit 方式で実装済み。ロジックは sinage_old と同等。

### 3.3 setupDragHandler（テキスト・画像・吹き出しのドラッグ移動）

**sinage_old**: `setupDragHandler` でテキスト・画像・吹き出しのドラッグ移動を実装。

**signage**: 未実装。

**対応**: ルート描画の動作には影響しないため、別タスクとする。

---

## 4. 動作確認のポイント

1. 全画面編集を開いた直後、地図が表示されるまで数秒待つ（スタイル・タイルのロード待ち）
2. 地図上をクリックして赤い丸（一時マーカー）が表示されるか確認
3. 2点以上クリック後、「確定」ボタンが有効になり、クリックで線が描画されるか確認

---

## 5. デバッグ用の確認

クリックが届いていない場合、以下を確認する。

- MapPreview の `emitMapClick` が `true` で渡されているか
- `@map-click` が OrderDetail で正しくバインドされているか
- ブラウザの開発者ツールで `map-click` の emit が発生しているか（Vue DevTools のイベントタブ）
- `addTempMarker` 実行時に `map.getSource('temp-markers')` が null でないか
