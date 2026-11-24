# 現場調査メモパッド Ver.1.4.59-dev 開発引継ぎ追補
更新日：2026-11-24

## 基準
- プロジェクト：現場調査メモパッド開発
- GitHub：stsnwi-AI/field-survey-memopad
- 基準開発版：Ver.1.4.58-dev（develop/marker-width-pc-zoom-v1.4.58-20261124）
- 最新開発版：Ver.1.4.59-dev
- 最新ブランチ：develop/desktop-mouse-pan-v1.4.59-20261124
- 公開版：ユーザーからVer.1.4.58ブランチにPagesを切り替え、PCで拡大縮小ボタンが表示されたと報告あり。本版のPages切替は未実施。

## ユーザー報告と確定要望
PCでは＋／－の倍率操作は表示できたが、拡大した図面をマウスで上下左右にドラッグして移動できない。マウスによるパンを追加し、従来の描画／選択、iPad／電子ペン操作を維持する。

## 修正内容
- `page-navigation.js`：上部の既存「✋ 移動」ボタンを、ポインタがfineのPC環境では図面のマウス移動モードのON/OFFとして機能させる。
- モードONで図面領域`#paper,#continuousPageStack`をマウス左ボタンでドラッグすると`workspace.scrollLeft`と`workspace.scrollTop`を両方更新。
- マウス操作に限定し、イベントのキャプチャフェーズで既存の書き込み／移動処理との競合を防ぐ。Pointer Captureで図面の外へ一時的に動かしても追随。マウスアップとキャンセルで操作状態を終了。
- 「選択・移動・削除」、手書き、マーカーなどのツールを選択するとマウス移動モードを解除。既存の図面オブジェクト移動・電子ペン選択、削除確認は維持。
- `survey-layout.css`：マウス移動ONでgrab、ドラッグ中grabbingカーソルを表示。
- `index.html`／`workspace.html`：Ver.1.4.59-dev、JS/CSS識別子更新。
- `sw.js`：field-survey-memopad-v1.4.59-desktop-pan-devへキャッシュ更新。
- マーカー初期幅5・変更幅保持・丸い線端、ペン赤1、PCズーム25％刻み最大300％、iPad縦スクロール／左端スクロール修正は継承。

## GitHub更新コミット
- page-navigation.js：1baad770ef6d161f02b603dd5de0798dafcce24d
- survey-layout.css：22307d78fd1dfc3b46af03003984b3a8f498e433
- index.html：54c61dea4efa3f1964b0eb1b9824e35d619874ef
- workspace.html：7b20c6d8cfe0efaebb04ae6cf552c17d4b2ece3c
- sw.js：f9fa6e6633757d1f7bad8d6fefea64576e3c05f3

## 確認済み
GitHub修正後のソースを再取得。マウス判定、モードON/OFF、縦横スクロール計算、Pointer Capture、イベント抑止、ツール選択時解除、ズームUI保持、CSS、Ver表示、キャッシュ名の存在を確認。page-navigation.js、mobile.js、continuous-pages.jsはJavaScript構文検査合格。

## 未検証・既知注意事項
- PCの実ブラウザで移動ボタンON→マウスドラッグ→左右上下パン→OFF、拡大／縮小後の位置、ページ切替、スクロール端を検証する必要あり。
- iPad指・電子ペンの描画と選択削除、写真・コメント、PDF保存再読込の回帰未検証。指／電子ペンの既存ハンドラー自体は変更していない。
- ブラウザがpointer:fineと認識しないPC環境では、従来の指用動作となる可能性がある。
- 軽量PDF保存は詳細設計v1.1の段階で未実装。
- 開発ZIP・完全引継ぎ書のライブラリとプロジェクト「ファイル（ソース）」双方への保存は未実施。GitHub追補ファイル保存のみ実行。

## 次の操作
ユーザーがGitHub Pagesで`develop/desktop-mouse-pan-v1.4.59-20261124`を選んで公開先を切替。PCで版表示を確認し、150～200%で「✋ 移動」をON→図面上ドラッグ→両方向移動を確認。問題があれば原因を調査し、既存機能を維持して開発ブランチを修正。確認後、旧版を残しソースZIPと完全なMarkdown引継ぎ書をProject・Libraryの双方へ登録する。

## 全プロジェクト共通ルール
最新版確定時は既存機能を維持し、GitHub/Projectソース/Libraryと引継ぎ書の版を照合。旧版・元PDF・写真・コメント等の削除／無断上書き禁止。外部送信・公開変更・ファイル破壊的操作は承認を得る。実装と実機検証を区別。チャット上限前に、名称、最新版・開発版、ファイル名・更新日、GitHubブランチ・コミット、確定仕様、変更履歴・承認、未解決・実装途中、検証済／未検証、公開差分、既存機能注意、次回最初の作業、共通ルールを含む省略なし.md引継ぎを作成し、LibraryとProject「ファイル（ソース）」に保存しユーザー確認後に移行する。
