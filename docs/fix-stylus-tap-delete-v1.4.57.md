# 現場調査メモパッド Ver.1.4.57-dev 開発引継ぎ追補
更新日：2026-11-17

## 基準と最新版
- プロジェクト：現場調査メモパッド開発
- GitHub：stsnwi-AI/field-survey-memopad
- 修正基準：develop/continuous-handwriting-red-pen-v1.4.56-20261117
- 開発中最新版：develop/fix-stylus-tap-delete-v1.4.57-20261117
- 現行確定版とGitHub Pagesの公開元は未確認。今回の作業では公開設定を変更していない。
- 旧版・写真・PDF・編集データの削除や上書きなし。

## ユーザー報告
- 電子ペンでオブジェクトを一度選択して「削除」を押しても無反応。
- 一度オブジェクトを動かしてから「削除」を押すと動く。
- 指では1回選択しただけで削除が動く。

## 確認できた原因
- `touch-context-menu.js`の電子ペン短押し処理が選択を実行する際、`desktopSetTool('select',false)`を利用して`mobile.js`のタッチ編集状態切替を通過していた。
- `mobile.js`の削除有効条件は`tool==='select'`かつ、iPad等では`touchMode==='edit'`を要求。`touchMode==='browse'`のままだと内部の`#delete`がdisabledとなり、上部`surveyPaletteDelete`からの`originalDelete.click()`も実行されない。
- 通常のペン短押しだけでなく、`survey.js`の調査番号ペン短押しにもモード同期が必要だった。

## 修正
- `touch-context-menu.js`：電子ペン短押し選択で`selectIndices([hit])`の直後、`setTouchMode('edit',false)`を呼び、`syncEditor();draw();window.updateTouchSelection?.()`で削除可否を即同期。
- `survey.js`：調査番号のペン短押し選択にも同様の同期を適用。
- `mobile.js`の削除条件・削除確認ダイアログ・複数選択・指操作は変更していない。
- `survey-quick-actions.js`の実削除操作も維持。ペンによる図形移動、調査番号移動、手書きの赤1.0、マーカー8.0、縦スクロール、拡大左端修正のコード変更なし。
- `index.html`上部・右下および`workspace.html`Ver.1.4.57-devへ変更。
- `sw.js`キャッシュ名field-survey-memopad-v1.4.57-stylus-delete-devへ変更。
- GitHubコミット：touch-context-menu 6f0ed70bbecd45566757c2cd1109cc158861a375、survey 8341fdbdcfbcaf5a67759f1f3efff03e0f3d930d、index c6f0e099113e0ea7c246e7fd6849f29af9285097、workspace 155e9b3b90f2e118995afede27333d7c72853269、SW 7f50fa3ff7f6ec59e80b6a4943c42ce474882efa。

## 検証済み
- GitHub更新後に再取得。上部・右下・workspaceバージョン、JavaScriptクエリ、Service Workerキャッシュ一致。
- `touch-context-menu.js`、`survey.js`、`mobile.js`、`survey-quick-actions.js`、`app.js`のJavaScript構文検査合格。
- 電子ペン短押し／調査番号短押しの処理に編集モード同期が存在し、削除確認機能が維持されることをコード上で確認。

## 未検証
- iPadで電子ペンによる1回選択→移動せず削除→確認→削除ができるか。
- 指による選択・削除、ペン長押しメニュー、手書きモードの継続、調査番号と写真・メモ、選択解除、複数選択、Undo、保存と再読み込み。
- ライブラリ／プロジェクト「ファイル（ソース）」への最新版ソースZIP・完全なMarkdown引継ぎ書の保存は未実施。GitHubでの追補保存とは別。

## 次の操作
1. ユーザー判断でGitHub Pagesを本開発ブランチへ切り替える。
2. iPadでVer.1.4.57表示を確認。
3. 電子ペンで通常オブジェクトを1回タップ、動かさずに削除ボタンを押し、確認ダイアログを検証。
4. 調査番号でも同様に確認し、写真・コメントの紐付けとPDF保存を回帰確認。
5. 承認後に完全引継ぎ書とソースZIPをProjectファイルとLibraryに保存。

## 全プロジェクト共通ルール
確定版・旧版・既存データの保持。ユーザー承諾のない削除・上書き・外部送信・公開変更禁止。推測と確認済みを区別。上部・右下の版とSW・JS/CSS識別子・GitHub原本を照合。チャット上限前に省略なしのMarkdown引継ぎを作成し両保存、ユーザー確認後に新チャットへ移行。
