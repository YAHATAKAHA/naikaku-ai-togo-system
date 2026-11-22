# デプロイガイド

このリポジトリは、公開可能な製品ソースとして、セルフホスト評価と商用デプロイ準備に必要な入口を提供します。EMYSTI の非公開サーバーファイル、Web サイトのソース、認証情報、クラウド設定は含めません。

商用利用、顧客向け納品、有料ホスティング、SaaS 運用、再販売、有料製品への組み込みには、合同会社EMYSTIからの別途書面許可が必要です。[COMMERCIAL-LICENSE.md](../COMMERCIAL-LICENSE.md) を確認してください。

## デプロイ形態

### ローカル開発

```bash
npm ci
npm run dev
npm run gateway
```

コード編集、adapter 検証、runner evidence の確認にはこの形態を使います。

### セルフホスト Preview

フロントエンドを build し、gateway をローカルで起動します。

```bash
npm ci
NAIKAKU_PUBLIC_GATEWAY_URL=http://127.0.0.1:8787 npm run preview:self-host
npm run gateway
```

フロントエンドは実行時に `/naikaku-config.js` を読みます。静的ホスティングでは、build 後にこのファイルを差し替えるだけで gateway URL を変えられます。

```bash
npm run build
NAIKAKU_PUBLIC_GATEWAY_URL=https://your-gateway.example.com npm run runtime-config
```

```js
window.NAIKAKU_CONFIG = {
  gatewayUrl: "https://your-gateway.example.com"
};
```

### Docker Compose Preview

```bash
cp .env.example .env
docker compose up --build
```

既定 URL:

- Workbench: <http://127.0.0.1:4173>
- Gateway health: <http://127.0.0.1:8787/health>

重要な環境変数:

- `NAIKAKU_PUBLIC_GATEWAY_URL`: ブラウザが使う gateway URL。`dist/naikaku-config.js` に書き込まれます。
- `VITE_NAIKAKU_GATEWAY_URL`: build-time の fallback gateway URL。
- `NAIKAKU_CORS_ORIGIN`: 許可する web origin。カンマ区切り。
- `NAIKAKU_RUNNER_CREDENTIALS`: 実 runner service 用の scoped credential JSON。
- `NAIKAKU_LEDGER_DIR`: approval / evidence ledger の保存先。Compose では `/data`。

`.env.example` に本物の secret を入れないでください。実際の値は、Git に入らない `.env`、CI secrets、vault、hosting provider の secret store に置きます。

### Hugging Face Static Demo

公開向けの製品体験用には、ブラウザだけで動く demo bundle を作成します。

```bash
npm ci
npm run huggingface:prepare
```

`output/huggingface-space/` が生成されます。Hugging Face で **Static** Space を作成し、その directory を Space repository の root として push してください。

```bash
cd output/huggingface-space
git init -b main
git add .
git commit -m "Publish Naikaku browser demo"
git remote add origin https://huggingface.co/spaces/<account>/naikaku-ai-togo-demo
git push -u origin main
```

生成される Space は `sdk: static` を使い、build 済みの frontend だけを配信します。これは hosted Naikaku gateway ではありません。API key を受け取らず、provider request、Codex / Claude / Qwen の呼び出し、コード実行、visitor data の保存を行いません。実際の provider 設定と scoped runner を使う完全な Workbench は、利用者のローカル環境で動かし続けます。

Hugging Face は現時点で Static Space を無料、Docker / Gradio Space を compute plan の対象として案内しています。compute を使う Space を作る前に、最新の plan を確認してください。

## Production Boundary

同梱の Compose ファイルはセルフホスト preview の基準です。商用 production では次の前提が必要です。

- `dist/` は hardened static host、CDN、reverse proxy で配信する。
- gateway は TLS と認証済み network boundary の後ろで動かす。
- runner credential は scope、rotation、expiry を設定する。
- provider key と runner credential は server-side secret storage にのみ置く。
- 顧客運用前に approval / evidence ledger を local file から durable authenticated storage へ移す。
- Git push、deploy、購入、外部送信、desktop control、customer-data access は明示的な approval gate の後ろに置く。
- production-ready と主張する前に production-mode release verification を実行する。

## Release Package

公開 release package は macOS developer preview archive です。

```bash
npm run release:mac-dev-package
```

この package command は、tracked file が dirty の場合は実行を拒否します。

## Deployment Readiness Check

```bash
npm run deployment:check
```

この check は次を確認します。

- deployment / commercial に必要なファイル;
- environment template の項目と blank secret placeholder;
- runtime gateway configuration;
- Docker / Docker Compose files;
- commercial license の見え方;
- 英語版・日本語版 deployment docs;
- public-source scope safety。

Contributor CI では `npm run ci:open-source` に `deployment:check` を含めます。
