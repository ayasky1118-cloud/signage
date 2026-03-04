/**
 * 注文・看板管理アプリ 共通設定・ユーティリティ
 *
 * 実装時にパラメータ追加・変更は本ファイルで一元管理すること。
 * HTMLのdata属性は data-order-no, data-order-name, data-company-name 等、
 * ケバブケースで記述（datasetでは orderNo, orderName, companyName に変換される）。
 */
(function (global) {
    'use strict';

    var CONFIG = {
        /** 注文情報・看板情報のURLパラメータキー（一覧→詳細/メイン遷移時に渡す検索条件） */
        ORDER_PARAM_KEYS: [
            'mode', 'orderNo', 'orderName', 'address', 'companyName',
            'manager', 'template', 'designType', 'updateDate', 'updater'
        ],
        /** 看板詳細専用の追加パラメータ（枝番など） */
        ORDER_DETAIL_EXTRA_KEYS: ['itemCode'],
        /** 一覧画面の検索条件パラメータキー */
        LIST_PARAM_KEYS: ['orderNo', 'searched']
    };

    /**
     * data属性またはオブジェクトから注文パラメータを構築
     * @param {Element|Object} source - tr要素（dataset）またはオブジェクト
     * @param {Object} [extra] - 追加パラメータ { key: value }（例: { itemCode: '01' }）
     * @param {boolean} [includeDetailKeys=true] - 看板詳細用のitemCode等を含めるか
     * @returns {URLSearchParams}
     */
    function buildOrderParams(source, extra, includeDetailKeys) {
        var params = new URLSearchParams();
        var keys = CONFIG.ORDER_PARAM_KEYS.concat(includeDetailKeys !== false ? CONFIG.ORDER_DETAIL_EXTRA_KEYS : []);
        var getVal = function (k) {
            if (source && source.dataset && source.dataset[k] !== undefined) {
                var v = source.dataset[k];
                return v != null ? String(v) : '';
            }
            if (source && typeof source === 'object' && source[k] !== undefined) {
                return String(source[k] || '');
            }
            return '';
        };
        params.set('mode', 'edit');
        keys.forEach(function (k) {
            var v = getVal(k);
            if (v != null && v !== '') params.set(k, v);
        });
        if (extra && typeof extra === 'object') {
            Object.keys(extra).forEach(function (k) {
                if (extra[k] != null && extra[k] !== '') params.set(k, String(extra[k]));
            });
        }
        return params;
    }

    /**
     * 現在のURLから指定キーのみを抽出してメインURLを構築（ブラウザバック時用）
     * @param {string[]} keys - 保持するパラメータキー
     * @returns {string} パス + クエリ
     */
    function buildMainUrlFromCurrent(keys) {
        var p = new URLSearchParams(window.location.search);
        var mainUrl = window.location.pathname;
        if (p.get('mode') === 'edit' && p.get('orderNo')) {
            var mp = new URLSearchParams();
            keys.forEach(function (k) {
                var v = p.get(k);
                if (v != null && v !== '') mp.set(k, v);
            });
            if (mp.toString()) mainUrl += '?' + mp.toString();
        }
        return mainUrl;
    }

    /**
     * ブラウザバック（bfcache復元）時にメインURLへ置換するイベントを登録
     * @param {string[]} paramKeys - 保持するパラメータキー
     */
    function onPageshowReplaceWithMainUrl(paramKeys) {
        window.addEventListener('pageshow', function (e) {
            if (e.persisted) {
                try {
                    var mainUrl = buildMainUrlFromCurrent(paramKeys);
                    history.replaceState(null, '', mainUrl);
                } catch (err) {
                    console.warn('app-config: pageshow URL replace failed', err);
                }
            }
        });
    }

    /**
     * 一覧画面から他画面へ遷移する前に、現在の検索条件をURLに反映
     * @param {string} pathname - 現在のパス（例: order_list.html）
     * @param {string} [orderNo] - 注文番号（空の場合は削除）
     */
    function replaceListUrlWithSearchState(pathname, orderNo) {
        try {
            var listParams = new URLSearchParams(window.location.search);
            if (orderNo && orderNo.trim()) {
                listParams.set('orderNo', orderNo.trim());
            } else {
                listParams.delete('orderNo');
            }
            listParams.set('searched', '1');
            var newUrl = pathname + (listParams.toString() ? '?' + listParams.toString() : '');
            history.replaceState(null, '', newUrl);
        } catch (err) {
            console.warn('app-config: replaceListUrl failed', err);
        }
    }

    // グローバルに公開
    global.AppConfig = {
        CONFIG: CONFIG,
        buildOrderParams: buildOrderParams,
        buildMainUrlFromCurrent: buildMainUrlFromCurrent,
        onPageshowReplaceWithMainUrl: onPageshowReplaceWithMainUrl,
        replaceListUrlWithSearchState: replaceListUrlWithSearchState
    };
})(typeof window !== 'undefined' ? window : this);
