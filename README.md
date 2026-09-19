# ProjectOS

ProjectOS (仮称) は、Git管理されているプロジェクトだけでなく、Git未導入のローカルフォルダ、外付けSSD、WSL、NAS、複数リポジトリで構成される開発資産などを、環境の垣根を越えて**一元管理**するための商用レベル・デスクトップアプリケーションです。

## 理念
**「Project != Git Repository」**
**「Project != Folder」**

ProjectOSはプロジェクトを「ファイルやリポジトリの集合体」ではなく、開発者の思考やタスク、インフラが紐づく「総合的なコンテキスト」として定義します。

## 主要機能

- **Universal Discovery Engine:** ローカルのあらゆるパス（深い階層のディレクトリ）を高速に走査し、`package.json` や `Cargo.toml` などのシグネチャからプロジェクトをヒューリスティックに検出します。
- **Library & Inbox:** 検出されたプロジェクトは「Inbox」に入り、開発者が承認したものだけが「Library」に永続化されます。
- **Local-First Database:** 全てのメタデータはローカルのSQLiteに安全に保存されます（Privacy First）。
- **Snapshot Engine:** プロジェクト全体の差分バックアップを、`.gitignore` ルール（`node_modules`や`target`の除外）を適用しながら `.tar.gz` 形式で瞬時に作成・復元します。
- **Task Runner:** プロジェクトごとに任意のコマンド（`npm run dev`, `cargo build` など）をOSのバックグラウンドプロセスとして起動し、非同期で追跡します。
- **Full-Text Search:** Tantivyを用いた超高速全文検索エンジンを内蔵し、コードやログを横断検索します。
- **Git Integration:** 外部依存なし（gitoxide採用）で、リポジトリの現在のブランチ、ダーティ状態、最新コミットを瞬時に取得します。

## 動作環境

- **OS:** Windows 11 (Primary), macOS, Linux
- **Frontend:** React, TailwindCSS v4, Lucide React (Vite 経由)
- **Backend:** Rust, Tauri v2
- **DB:** SQLite (sqlx)

## クイックスタート

### 前提条件
- Rust (stable)
- Node.js & npm
- OS 固有のビルドツール（C++ビルドツール等）

### 開発用ビルドと起動

1. 依存関係のインストール:
   ```bash
   npm install
   ```

2. Tauri 開発モードでアプリを起動:
   ```bash
   npm run dev
   ```

### データベースのマイグレーション
初回起動時に、`~/.gemini/antigravity-ide/data/projectos.db` (環境によりパスは異なります) に自動的にSQLiteデータベースが生成・マイグレーションされます。

## ライセンス
All Rights Reserved.
