# かんたんPDF編集：開発環境

ビルド不要の静的PDF編集アプリです。開発ルールと回帰検証一覧は [AGENTS.md](AGENTS.md)、現状とVer.3.5.1の比較結果は [調査報告](docs/development-audit.md) を参照してください。

Python 3、Node.js 20以上を用意します。

```sh
npm ci
npx playwright install chromium
npm run dev
```

`http://127.0.0.1:8000/` を開きます。別のターミナルで実行します。

```sh
npm run check
npm test
```

既存のChromiumを使う環境では `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`。テスト先は `PDF_EDITOR_URL` で指定できます。保存した検証PDFは `test-results/` に置かれ、Gitには含まれません。テストはローカルの検証用URLに対して実施してください。

PlaywrightのOS依存ライブラリが必要なら、環境の管理方針に従って `npx playwright install --with-deps chromium` を実行します。本番アプリはnpmや外部CDNに依存しません。localhostのHTTPではPWAの自動登録は行わないため、テストが明示的にService Workerを登録します。

開発作業は作業ブランチとPRで提示し、mainへのマージと公開は別途指示を受けてから行います。
