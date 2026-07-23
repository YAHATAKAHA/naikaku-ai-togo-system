# Naikaku AI Togo System

Naikaku AI Togo System は、日本発・日本語主導の、ソフトウェア開発向けマルチモデル AI 内閣ワークベンチです。

単一のモデルに作業を任せきるのではなく、計画、実行、批評、監督、採点、記憶、安全確認といった役割に分けてミッションを扱います。ローカル CLI や自動化ツールなどのランナーは、承認ゲート、権限スコープ、実行レシート、成果物レビューの後ろに接続されます。

[English README](./README.md)

## 概要

Naikaku は、AI 支援による開発作業を監査可能にしたい開発者のためのプロジェクトです。

- 複数の AI ロールが、実行前に同じミッションを確認できます。
- ロールごとのデータアクセスポリシーにより、公開情報、内部情報、機密、秘密情報、個人データ、顧客データをモデルや runner へ渡す前に分離できます。
- プロバイダー設定では、ブラウザに生の秘密情報を保存せず、環境変数エイリアスを使います。
- ランナー作業は、契約、コマンド許可リスト、証跡要求によって制限されます。
- 実行結果は、レシート、コマンド出力、変更ファイル参照、監査チェックが揃った場合にのみ受け入れます。
- 製品 UI は日本語を主言語とし、英語、簡体字中国語、繁体字中国語、韓国語にも対応します。

このリポジトリには、製品ソース、テスト、ローカル検証ドリル、公開技術ドキュメントを含みます。

## なぜ日本発か

日本企業の多くは AI に強い関心を持ちながらも、AI にどこまで任せるのか、誰が結果に責任を持つのか、実行後にどの証跡が残るのかを慎重に見ます。

Naikaku は、その現場感に合わせて設計しています。自動化を必要とする顧客業務、研究ワークフロー、開発チームの検証作業で使えるように、役割分離、権限境界、実行レシート、成果物監査を最初から見える形にしています。

今回の公開版は、日本からその考え方を外へ出すものです。無制限に動くエージェントではなく、モデル、ローカル runner、人間の承認をひとつの監査可能なループにつなぐためのワークベンチです。

## 開発・運営

Naikaku AI Togo System は、合同会社EMYSTIが開発・保守しています。

公開リンク:

- 製品サイト: <https://naikaku.emysti.net/>
- 日本語ページ: <https://naikaku.emysti.net/ja/>
- 会社サイト: <https://www.emysti.net>
- GitHub Releases: <https://github.com/YAHATAKAHA/naikaku-ai-togo-system/releases>

製品サイトは公開向けの情報ページです。サイトのソースコード、デプロイ設定、サーバーファイルは、この公開リポジトリには含めません。

## 何ではないか

Naikaku は、無制限のデスクトップ操作エージェントではありません。このリポジトリを clone しても、Mac の任意操作、本番デプロイ、購入、外部送信、Git push、ホスト上の秘密情報へのアクセスは付与されません。

実際のランナー連携は明示的に扱う必要があります。利用者がツールをインストールし、ライセンスを確認し、アダプターを設定し、許可するワークスペースを選び、証跡を確認したうえで作業を受け入れます。

## 公開リポジトリの範囲

この公開リポジトリは、Naikaku の製品ソースと公開技術ドキュメントのための場所です。

Web サイトのソース、デプロイファイル、Nginx / Certbot / クラウド設定、EMYSTI AI ナレッジベース、サーバーバックアップ、非公開事業メモ、認証情報、Cookie、生の環境ダンプ、顧客データは含めません。

ファイルを追加する前に [PUBLIC-SOURCE-SCOPE.md](./PUBLIC-SOURCE-SCOPE.md) を確認してください。

## クイックスタート

必要環境:

- Node.js 22 以上
- npm
- ローカルランナー実験には macOS を推奨

```bash
npm ci
npm run dev
```

### Naikaku CLI

このリポジトリには、Naikaku 自身の `naikaku` コマンドも含まれます。まずは npm 経由で使え、必要ならローカル shell に link できます。

```bash
npm run naikaku -- doctor
npm link
naikaku doctor
naikaku start
naikaku gateway
naikaku task "レビュー可能な実装計画を準備する"
```

`doctor` は Node.js、依存関係、local gateway の health、`PATH` 上の `codex`、`claude`、`qwen` だけを確認します。モデル、Coding CLI、provider、desktop automation は実行しません。人が読む CLI は日本語を主言語とし、`--locale` で `ja`、`en`、`zh-Hans`、`zh-Hant`、`ko` を選べます。対話ターミナルだけで控えめな色を使い、`NO_COLOR` または `--no-color` を尊重します。`task` はデフォルトで統制された準備モードです。runner を明示しない限り、外部 Coding CLI を始めず、レビュー可能な task と evidence package だけを準備します。`naikaku verify` は公開ソース向け検証一式を実行します。

ローカル API とランナーゲートウェイ機能を使う場合は、別のターミナルで起動します。

```bash
npm run gateway
```

このリポジトリには API キー、runner token、ホスト済み認証情報は含めません。`.env.example` は空のプレースホルダーです。live provider や認証付き runner を使う利用者が、自分のローカル shell、`.env`、ローカル vault、またはデプロイ環境に値を設定します。

### 本機の Coding CLI

コード工程では、provider key を Workbench に貼り付ける代わりに、すでに認証済みの本機 CLI を使う方法が最も簡単です。gateway 起動後の最初の画面で **本機の Coding CLI を使う** を選ぶと、Naikaku は本機の `codex`、`claude`、`qwen` コマンドを確認し、固定された gateway 側 runner テンプレートだけを表示します。ブラウザには CLI のログイン情報、Coding Plan の認証情報、任意の shell コマンドを渡しません。

Qwen Code は先に upstream CLI を導入して認証します。`qwen` を起動し、`/auth` から **Alibaba ModelStudio -> Coding Plan**（または対応 provider）を選択してください。本機でコマンドが検出された後、`qwen-code-local` を有効にし、対象 worktree を確認してから、その実行に限って adapter を明示確認します。テンプレートは YOLO ではなく制御された Auto mode と turn/tool の上限を使い、stdout/stderr を記録します。Naikaku のレシートがない実装は、完了として受け入れません。

公開検証チェック:

```bash
npm run public-scope:check
npm run deployment:check
npm run strategy:iterate
npm run build
npm run test
npm run open-source:mvp-check
```

`strategy:iterate` は、日本発の位置づけ、ロール単位のデータガバナンス、デプロイ / 商用準備、貢献導線、リリース証跡という 5 つの方向性ゲートを確認します。`open-source:mvp-check` は、有料モデル認証情報を使わない検証パスです。ローカル fixture と replay provider を使います。

## リリースパッケージ

現在の公開パッケージは、macOS 向けの開発者プレビューアーカイブです。署名済み `.dmg` インストーラーではありません。

最新リリース:

<https://github.com/YAHATAKAHA/naikaku-ai-togo-system/releases/latest>

アーカイブから起動:

```bash
tar -xzf naikaku-ai-togo-system-0.1.0-mac-dev-preview.tar.gz
cd naikaku-ai-togo-system-0.1.0-mac-dev-preview
npm ci
npm run dev
```

公開ソースの変更履歴は [CHANGELOG.md](./CHANGELOG.md) に、商用デプロイ準備の確認項目は [docs/commercial-deployment-checklist.md](./docs/commercial-deployment-checklist.md) にまとめています。

## アーキテクチャ

Naikaku は主に 4 つの層で構成されています。

1. Workbench UI - ミッション入力、ロール設定、readiness、実行ログ、証跡レビューのための React/Vite UI。
2. Cabinet domain - ロール、判断、自動化、サンドボックスポリシー、記憶、レシート、検証を扱う TypeScript domain module。
3. Local gateway - プロバイダー呼び出し、ランナー契約、ledger record、サンドボックス実行ゲートのための server-side route。
4. Runner adapters - Codex CLI、Claude Code、Alibaba Cloud Coding Plan と接続できる Qwen Code、OpenHands 系 CLI、OpenClaw 系 local agent、Hammerspoon、Playwright、custom CLI などを接続する境界付き bridge。

ランナー層は contract-first です。Naikaku が作業完了として扱う前に、ランナーは構造化された証跡を返す必要があります。

## プロバイダー

Naikaku は bring-your-own provider 構成に対応します。ブラウザ状態には生のキーではなく、`NAIKAKU_OPENAI_API_KEY` のような環境変数エイリアスを保存します。

この公開リポジトリが提供するのは、設定項目と例だけです。プロジェクト保守者は共用 provider key、gateway token、同梱クレジットを提供しません。live model call を使う場合、利用者が gateway process の環境変数に `NAIKAKU_OPENAI_API_KEY` や `DASHSCOPE_API_KEY` などを設定します。有料認証情報なしでも、fixture / replay による検証は実行できます。

Workbench の Provider 設定確認は、課金される prompt を provider に送らず、endpoint / model / alias の境界とキーの利用可能性だけを確認します。この確認のために入力するセッション限定キーは保存されず、live mode を有効にはしません。live 内閣実行には、同じ alias をローカル gateway process の環境変数へ設定してください。gateway がオフラインの場合、Workbench はローカル構造確認を未確認として記録し、provider を誤って ready にはしません。

対応する adapter family:

- OpenAI-compatible endpoints
- OpenRouter
- Anthropic
- Aliyun DashScope/Qwen
- Gemini-compatible or custom HTTP endpoints
- テスト用 local replay/mock providers

## セキュリティ方針

高影響の操作に対する基本姿勢は deny by default です。

- フロントエンドは生の provider secret を保存しません。
- ロール単位のデータポリシーにより、制限データを block、local-only、gateway-mediated として扱えます。
- token や API key の例はプレースホルダーです。実際の値は、利用者のローカル環境または非公開デプロイにだけ置きます。
- 外部コンテンツと tool output は untrusted として扱います。
- Shell と runner action には scoped contract が必要です。
- 本番デプロイ、Git push、外部送信、購入、広範なホスト操作には明示的な承認が必要です。
- 実行と、レシートレビュー / 成果物監査は分離します。
- 公開リリースチェックには `npm run public-scope:check` を含めます。

詳細:

- [docs/security-sandbox.md](./docs/security-sandbox.md)
- [SECURITY.md](./SECURITY.md)

## デプロイ

セルフホスト preview は Docker Compose で起動できます。

```bash
cp .env.example .env
docker compose up --build
```

フロントエンドは実行時に `/naikaku-config.js` を読みます。そのため、ソースコードを変更せずに deployment 側で gateway URL を差し替えられます。[docs/deployment.ja.md](./docs/deployment.ja.md) と [docs/deployment.md](./docs/deployment.md) を確認してください。

## ドキュメント

- [Architecture](./docs/architecture.md)
- [Gateway API](./docs/gateway.md)
- [Provider adapters](./docs/api-adapters.md)
- [Deployment 日本語](./docs/deployment.ja.md)
- [Deployment](./docs/deployment.md)
- [Commercial deployment checklist](./docs/commercial-deployment-checklist.md)
- [Strategy iterations](./docs/strategy-iterations.md)
- [Architecture decision records](./docs/adr/README.md)
- [Sandbox security](./docs/security-sandbox.md)
- [Localization](./docs/localization.md)
- [macOS developer preview](./docs/install/macos-dev-preview.md)
- [Open-source reference notes](./docs/reference/open-source-research.md)

## コントリビュート

provider adapter、runner adapter、テスト、UI 改善、ローカライズ、ドキュメント、セキュリティレビューへの貢献を歓迎します。

Pull Request の前に実行してください。

```bash
npm run ci:open-source
```

このコマンドには、公開範囲チェック、デプロイ readiness、strategy iteration evidence、有料 provider なしの MVP smoke、unit test、whitespace check が含まれます。

[CONTRIBUTING.md](./CONTRIBUTING.md) と [PUBLIC-SOURCE-SCOPE.md](./PUBLIC-SOURCE-SCOPE.md) を読んでください。非公開のデプロイファイル、Web サイトのソース、認証情報、顧客データ、非公開ログ、内部事業資料は提出しないでください。

## ライセンス

Naikaku AI Togo System は [PolyForm Noncommercial License 1.0.0](./LICENSE) のもとで配布されています。

個人学習、非商用研究、趣味利用、非商用セルフホスティングは許可されます。商用利用、有料ホスティング / SaaS、再販売、商用製品への統合、顧客向け納品、商用変更には、合同会社EMYSTIからの別途書面許可が必要です。

[COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md) と [NOTICE](./NOTICE) も確認してください。
