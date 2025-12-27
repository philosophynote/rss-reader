RSS Reader (Feedly-like, RSS-only) — Request
What I want

RSSに限定したFeedly風RSSリーダーを作りたい。
複数RSSを定期取得して保存し、未読/既読・保存（後で読む）で管理できること。
さらに、ユーザーが登録したキーワードとの関連性に基づいて記事の重要度をスコア化し、重要度順にランキング表示したい。重要度には「どのキーワードがどのように寄与したか」の説明を付けたい。

Must have

複数RSSフィード登録（フォルダ分類できると嬉しい）

定期取得（失敗しても安全にリトライできる）

重複保存しない（link等で冪等）

記事一覧：時系列 / 重要度順

未読/既読、保存/解除

キーワード登録/無効化（重み付けは任意）

重要度スコアと理由（reasons）を保持・表示

Must NOT

非RSS対応（スクレイピング/RSS Builder不要）

認証/マルチユーザー（当面単一ユーザー）

常時起動のサーバ（サーバレス優先）

Tech constraints

Backend: Python + FastAPI + SQLModel

Deploy: AWS Lambda Web Adapter（コンテナ）+ API Gateway（HTTP API）+ EventBridge（定期実行）

Frontend: TypeScript + React（TanStack Query / TanStack Table中心）

Goal: AWS寄せ & 低ランニングコスト