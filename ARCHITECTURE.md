# ProjectOS Architecture

ProjectOS は Rust の強固な型システムとモジュール性を最大限に活かすため、Cargo ワークスペースを用いた **マルチクレートアーキテクチャ** を採用しています。
それぞれのクレートは単一責任の原則 (SRP) に基づき、ドメイン駆動設計 (DDD) を意識して分割されています。

## Crate Dependency Graph

```mermaid
graph TD
    App[apps/desktop (Tauri)] --> DB[projectos-db]
    App --> Discovery[projectos-discovery]
    App --> Runner[projectos-runner]
    App --> Git[projectos-git]
    App --> Search[projectos-search]
    App --> Snapshot[projectos-snapshot]

    DB --> Core[projectos-core]
    Discovery --> Core
    Runner --> Core
    Git --> Core
    Search --> Core
    Snapshot --> Core
```

## クレート構成

### 1. `projectos-core` (ドメインモデル)
すべてのシステムの中核となるクレートです。
他のすべてのクレートから参照され、`ProjectId` や共通のエラー型、基盤となるデータ構造のみを定義します。依存関係を持たせないことで、循環参照を防ぎます。

### 2. `projectos-db` (永続化層)
SQLite データベースとの通信を担当します。
- **スタック:** `sqlx`, `sqlite`
- **責務:** `Project` テーブルの CRUD 操作、マイグレーション（起動時に自動実行）、アーカイブフラグの管理。

### 3. `projectos-discovery` (探索エンジン)
ファイルシステムをスキャンし、開発プロジェクトを高速に見つけ出します。
- **スタック:** `ignore` (高速ディレクトリ走査)
- **責務:** 特定のファイル (`package.json`, `Cargo.toml`, `Assets` 等) からプロジェクトの言語、パッケージマネージャー、フレームワークを推論し、確信度 (Confidence) を算出します。

### 4. `projectos-git` (Gitインテグレーション)
プロジェクトの Git 状態を解析します。
- **スタック:** `gix` (gitoxide: ピュアRustの超高速Git実装)
- **責務:** 現在のブランチ名、ダーティフラグ、最新コミット情報 (ハッシュ、Author、日付、メッセージ) の取得。C言語バインディングを避けるため `git2` ではなく `gix` を採用しています。

### 5. `projectos-runner` (タスク/プロセスマネージャー)
プロジェクト固有のコマンド (`npm run dev` など) を OS プロセスとして起動・管理します。
- **スタック:** `tokio::process`
- **責務:** プロセスの起動、標準出力・標準エラーのキャプチャ、非同期でのステータス追跡 (Running, Success, Failed)。`TaskId` を用いてフロントエンドと状態を同期します。

### 6. `projectos-search` (全文検索エンジン)
プロジェクト全体に対する強力な全文検索を提供します。
- **スタック:** `tantivy`
- **責務:** ドキュメント (コード、メモ、ログ等) のインデックス化、クエリパーサーによる検索、HTMLタグでハイライトされたスニペットの自動生成。ローカルファーストで動作する Mmap ベースのインデックス。

### 7. `projectos-snapshot` (バックアップ・スナップショット)
プロジェクトの特定の時点の状態をアーカイブとして保存します。
- **スタック:** `tar`, `flate2`, `ignore`
- **責務:** `.gitignore` のルールに従い、巨大な一時ファイル (`node_modules` など) を自動で除外しながら `.tar.gz` 形式の軽量なスナップショットを作成・展開します。

### 8. `apps/desktop` (フロントエンド & Tauriホスト)
ユーザーインターフェースと、全ての Rust エンジンを統合する IPC ブリッジの役割を果たします。
- **スタック:** Tauri v2, React, TailwindCSS v4, Vite, Lucide React
- **責務:** Rustの各種エンジンの初期化 (データベース接続、検索インデックスのマウント等) およびフロントエンドからの Tauri `invoke` コマンドに対するルーティング。

## データフロー

1. ユーザーがフロントエンド (React) で「Scan Folder」をクリック。
2. Tauri IPC (`scan_directory` コマンド) が `projectos-discovery` を呼び出し、ディレクトリツリーを走査。
3. 発見された `DiscoveryCandidate` のリストが React に返され「Inbox」ビューに表示される。
4. ユーザーがプロジェクトを「Import」すると、IPC経由で `projectos-db` に登録される。
5. Library ビューの表示時に、バックグラウンドで `projectos-git` により最新の Git 状態が非同期取得される。
6. プロジェクトに対してタスクを実行すると、`projectos-runner` がサブプロセスを生成し UUID を発行。UIはスピナーを表示して完了を待機する。
