"""
住所検証API（MapTiler Geocoding 利用）。

登録ボタン押下時に、入力住所がマップ取得可能かチェックする。
API キー未設定時は検証をスキップし valid: true を返す。
"""

import json
import logging
import ssl
from urllib.parse import quote
from urllib.request import Request, urlopen

import certifi
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/address", tags=["address"])

MAPTILER_GEOCODING_URL = "https://api.maptiler.com/geocoding/{query}.json"
TIMEOUT_SEC = 10  # 外部API呼び出しのタイムアウト（秒）

# macOS 等で Python がシステム証明書を持たない場合に certifi の CA バンドルを使用
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())


@router.get("/validate")
def validate_address(
    address: str = Query(..., description="検証する住所文字列"),
):
    """
    住所を MapTiler Geocoding API で検証する。

    レスポンス:
      - ヒット時: { "valid": true, "message": null }
      - 0件時: { "valid": false, "message": "該当する住所が見つかりません。" }
      - API キー未設定時: { "valid": true, "skipped": true }（検証スキップ。フロントで区別可能）
    """
    address = (address or "").strip()
    if not address:
        return {"valid": False, "message": "住所が空です。"}

    api_key = (settings.MAPTILER_API_KEY or "").strip()
    if not api_key:
        logger.info("住所検証: MAPTILER_API_KEY 未設定のためスキップ（valid=true で返却）")
        return {"valid": True, "skipped": True}  # skipped: 検証をスキップした旨（フロントで区別可能）

    try:
        # safe="" で日本語等を % エンコード
        encoded = quote(address, safe="")
        url = MAPTILER_GEOCODING_URL.format(query=encoded) + f"?key={api_key}&country=jp"
        req = Request(url, headers={"User-Agent": "MapSign-Backend/1.0"})
        with urlopen(req, timeout=TIMEOUT_SEC, context=_SSL_CONTEXT) as resp:
            data = json.loads(resp.read().decode())
        features = data.get("features") or []
        valid = len(features) > 0
        logger.info("住所検証: features=%s, valid=%s", len(features), valid)
        return {"valid": valid, "message": None if valid else "該当する住所が見つかりません。"}
    except Exception as e:
        logger.exception("MapTiler Geocoding の呼び出しに失敗しました: %s", e)
        return {"valid": False, "message": "住所の検証中にエラーが発生しました。"}


@router.get("/geocode")
def geocode_address(
    address: str = Query(..., description="ジオコーディングする住所文字列"),
):
    """
    住所を MapTiler Geocoding API で検索し、最初の結果の座標を返す。

    レスポンス:
      - ヒット時: { "lat": number, "lng": number }（緯度・経度。地図表示用）
      - 0件時: 404
      - API キー未設定時: 503（地図表示不可のため）
    """
    address = (address or "").strip()
    if not address:
        return JSONResponse(status_code=400, content={"detail": "住所が空です。"})

    api_key = (settings.MAPTILER_API_KEY or "").strip()
    if not api_key:
        logger.info("ジオコーディング: MAPTILER_API_KEY 未設定のためスキップ")
        return JSONResponse(status_code=503, content={"detail": "地図表示の設定がありません。"})

    try:
        # safe="" で日本語等を % エンコード
        encoded = quote(address, safe="")
        url = MAPTILER_GEOCODING_URL.format(query=encoded) + f"?key={api_key}&country=jp"
        req = Request(url, headers={"User-Agent": "MapSign-Backend/1.0"})
        with urlopen(req, timeout=TIMEOUT_SEC, context=_SSL_CONTEXT) as resp:
            data = json.loads(resp.read().decode())
        features = data.get("features") or []
        if not features:
            return JSONResponse(status_code=404, content={"detail": "該当する住所が見つかりません。"})
        # GeoJSON 形式: coordinates は [lng, lat] の順
        geom = features[0].get("geometry") or {}
        coords = geom.get("coordinates") or []
        if len(coords) < 2:
            return JSONResponse(status_code=404, content={"detail": "座標を取得できませんでした。"})
        return {"lng": float(coords[0]), "lat": float(coords[1])}
    except Exception as e:
        logger.exception("MapTiler Geocoding の呼び出しに失敗しました: %s", e)
        return JSONResponse(status_code=500, content={"detail": "住所の検索中にエラーが発生しました。"})
