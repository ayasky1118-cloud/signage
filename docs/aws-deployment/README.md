# AWS デプロイ関連ドキュメント

開発用インフラ構築から客先 AWS へのデプロイまで、AWS 移行に関する手順書をまとめる。

---

## 手順一覧（実施順）

| No | ドキュメント | 内容 |
|----|--------------|------|
| 00 | [00.環境準備手順.md](00.環境準備手順.md) | 別 PC 用の環境構築（AWS CLI、Docker、Git） |
| 01 | [01.Dockerfile作成手順.md](01.Dockerfile作成手順.md) | Dockerfile 作成（ローカル動作確認用） |
| 02 | [02.Lambdaバックエンド構築.md](02.Lambdaバックエンド構築.md) | Lambda バックエンド構築（API Gateway, Lambda, RDS Proxy, Secrets Manager） |
| 02-RDS | [02.RDS作成手順（コンソール）.md](02.RDS作成手順（コンソール）.md) | RDS 作成のコンソール詳細手順（やり取り含む） |
| 03 | （今後） | GitLab Auto DevOps 設定 |
| 04 | （今後） | 客先 AWS デプロイ手順 |

---

## 前提

- **フロントエンド**: Amplify でホスト（設定済み）
- **バックエンド**: API Gateway + Lambda + RDS Proxy + RDS
- 開発環境で動作確認後、客先 AWS に適用する流れ
