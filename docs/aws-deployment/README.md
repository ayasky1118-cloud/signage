# AWS デプロイ手順書

現行の AWS 構成（2026-03 時点）を正として、構築手順をまとめたドキュメント。

---

## ドキュメント一覧

| No | ドキュメント | 内容 |
|----|--------------|------|
| 00 | [00.環境準備手順.md](00.環境準備手順.md) | AWS CLI、Docker、Git のインストール |
| 01 | [01.現行構成リファレンス.md](01.現行構成リファレンス.md) | **現行 AWS リソース一覧**（ID・エンドポイント等） |
| 02 | [02.VPC・ネットワーク構築手順.md](02.VPC・ネットワーク構築手順.md) | VPC、サブネット、ルートテーブル、NAT ゲートウェイ |
| 03 | [03.RDS作成手順.md](03.RDS作成手順.md) | RDS for MySQL、セキュリティグループ |
| 04 | [04.Secrets Manager・RDS Proxy手順.md](04.Secrets%20Manager・RDS%20Proxy手順.md) | DB 認証情報、RDS Proxy |
| 05 | [05.Lambda・API Gateway構築手順.md](05.Lambda・API%20Gateway構築手順.md) | Lambda、API Gateway、環境変数 |
| 06 | [06.Amplifyデプロイ手順.md](06.Amplifyデプロイ手順.md) | フロントエンドのデプロイ |
| 06b | [06b.Cognito作成手順.md](06b.Cognito作成手順.md) | **CGS 環境用** Cognito User Pool の新規作成 |
| 07 | [07.データ移行手順.md](07.データ移行手順.md) | ローカル ↔ RDS のデータ移行・復元 |
| 08 | [08.ローカル開発の環境切り替え.md](08.ローカル開発の環境切り替え.md) | ローカル・検証・本番の切り替え |
| 09 | [09.トラブルシューティング.md](09.トラブルシューティング.md) | 接続エラー、地図表示、よくある事象 |
| 10 | [10.クイックリファレンス.md](10.クイックリファレンス.md) | よく使うコマンド・チェックリスト |

---

## アーキテクチャ概要

```
[Amplify フロント] ──→ [API Gateway] ──→ [Lambda]
                                              │
                                              ↓
                                        [RDS Proxy]
                                              │
                                              ↓
                                        [RDS MySQL]
```

- **フロントエンド**: Amplify（main ブランチ）
- **バックエンド**: API Gateway + Lambda（FastAPI + Mangum）
- **DB**: RDS for MySQL + RDS Proxy
- **認証**: Cognito

---

## バックアップ

現行手順書のバックアップは `docs/aws-deployment-backup-20260310/` に保存済み。
