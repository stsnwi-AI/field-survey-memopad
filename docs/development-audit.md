# 開発環境・Ver.3.5.1反映状況の初回調査

> 以下は初回調査時（基準コミット8df0d42）の記録です。後続のUI修正とVer.3.5.1取り込み状況は [削除UIの変更](delete-ui.md) を参照してください。

調査日：2026-10-15（日本時間）。対象：`stsnwi-AI/iwasaki-pdf-editor`。
基準コミット：`8df0d428e6ef471b6d17d2915bf67495967121f0`。

## 現在のコードとルール

- 現在のmainはVer.3.5.0。GitHub上のブランチ検索ではmainのみ、PR検索では既存PRなし。ローカルHEADとGitHubの最新コミットは上記SHAで一致し、mainのmobile.jsも確認した。
- 既存のAGENTS.md、README、package.json、テスト設定、GitHub Actionsワークフローは追跡ファイルになかった。7件のコミットメッセージはすべて `Add files via upload`。明文化された開発ルールは見つからず、コードのデータ形式・保存時検証・コメントを基準に整理した。
- 静的HTML/CSS/JSと同梱vendorの構成。開発用package.json・lockfile、起動/構文チェック/ブラウザ回帰検証、AGENTS.md、READMEを追加する。本体30ファイルは変更しない。
- shellのgit fetchは当初プロキシ接続に失敗したため、GitHubコネクタでmainと履歴を確認した。npm依存導入とローカルブラウザ検証は実行できた。

## Ver.3.5.1は未反映

ユーザー提供 `PDF_Editor_v3.5.1_Touch_Delete_Safety.zip` の `site/` と基準コミットの全30ファイルをバイト単位で比較した。

ZIP SHA-256：`e1d47419bdb449f7fb861ffaf1e0db8080b592ad29b4fb180272e4dc0be7c308`。

26ファイルは完全一致。変更は次の4ファイル、ZIPのsite側の追加は空の `.nojekyll` 1件。ZIP直下の `スマホ削除_操作変更.txt` は説明資料で、サイト配布資産ではない。説明資料に公開指示が含まれるが、今回のユーザー指示は差分報告とPR提示のため公開は実施しない。

| ファイル | 現在のmain | ZIPのVer.3.5.1 |
| --- | --- | --- |
| index.html | Ver.3.5.0、資産クエリ3.5.0、通常の削除ボタン、確認dialogなし | 表示・CSS/JSクエリ3.5.1、削除ボタン初期disabled、対象説明・やめる・この1件を削除のdialog追加 |
| mobile.js | 選択があれば削除有効、touchDeleteから従来deleteを即実行 | pendingTouchDeleteを保持。編集かつselectかつ対象選択かつ非処理中だけ削除有効。閲覧時は選択解除。対象種類/文字先頭60文字を確認画面に表示。取消/Escapeでは変更しない。対象ページidとオブジェクト参照を確認し、1件だけ削除。削除後は選択解除・閲覧モード・削除OFF。スマホのサイドバー/右クリック削除も同じ確認へ、PCは従来ハンドラーを使用。確認中は新しいtouch pointerdownを拒否 |
| style.css | 削除OFF/確認dialogの専用スタイルなし | OFF表示、有効時の強調、確認dialog・backdrop・48px以上の操作ボタンを追加 |
| sw.js | APP_CACHE = pdf-memo-v3.5.0 | APP_CACHE = pdf-memo-v3.5.1。その他の内容は同じ |
| .nojekyll | なし | 空ファイル追加（GitHub Pages用） |

`app.js`、manifest、icons、vendorとフォントは完全一致。元PDF・編集データ形式の変更はない。

読みやすくHTMLタグ間に改行を入れた [参照差分](ver-3.5.1-reference.diff) を添付する。この差分はレビュー用で、git apply用ではない。空の.nojekyllの追加はこの表に記録した。元のZIPはwork配下に展開して比較し、リポジトリには追加しない。

今回のPRではVer.3.5.1を取り込まず、版表示も変更しない。対策が既に反映されているという誤認を避け、後続の取り込み作業でこのZIPを基準にできるようにする。

## 検証結果と範囲

- 環境：Node.js 24.19.0、npm 11.9.0、Python 3.12.14、Playwright 1.62.1、システムChromium。`npm ci --ignore-scripts` 成功、`npm run check` 成功。
- `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` 成功。2ページのサンプルに日本語の複数行注釈を追加、回転・複製・Undo、保存名ダイアログ取消、保存PDFの復元と再保存・再復元、元PDF bytes/注釈データの一致を確認。
- 390×844のタッチエミュレーションで初期閲覧、閲覧タップで注釈を追加しないこと、編集・選択・現行の即時削除・Undo、共有PDFの生成・ダウンロードと2ページ維持を確認。
- Service Worker明示登録後にキャッシュ33エントリ、オフライン再読込・サンプル表示を確認。ブラウザ例外とアプリ資産のHTTPエラーは0件。
- 既存の環境外スモークテストも成功（保存・再編集・キャッシュ30資産）。この検証PDFやテスト成果物はコミットしない。
- 全7種の実操作、日本語の実PDF、旧schemaVersion 1の実資料、保存ピッカー、iOS/Android実機、ネイティブ共有、PWAインストール/更新は未実施。AGENTS.mdの手動検証表に整理した。ブラウザ検証の成功だけで実機対応完了とは扱わない。
- 今回の回帰テストはmainのVer.3.5.0を基準にしている。Ver.3.5.1取り込み時には即時削除の期待値を確認画面・取消・単一削除・連打防止・ページ変更時の中止へ変更する必要がある。

## コード確認で見つかった注意点

- Ver.3.5.1のDelete/Backspace経路もラップされたdeleteから確認に入るが、app.js側は確認確定前に「選択した書き込みを削除しました。」と表示する。後続取り込みで表示の整合を確認する。
- 現行コードのrestoreTouchCheckpointはhistory.lengthのみ復元する。履歴上限60件の状態ではsnapshotのshiftによる先頭履歴の消失まで復元できない可能性がある。タッチ取消の境界条件として後続で検証する。

これらの動作修正は今回の開発文書整備には含めない。
