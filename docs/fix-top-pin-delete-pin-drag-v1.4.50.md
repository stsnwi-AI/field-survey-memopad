# 現場調査メモパッド Ver.1.4.50-dev 修正・引継ぎ追補
更新日：2026-11-17

## 対象情報
- GitHub：stsnwi-AI/field-survey-memopad
- 今回の基準：develop/pen-drag-pin-toggle-red-delete-v1.4.49-20261117
- 新開発版：develop/fix-top-pin-delete-pin-drag-v1.4.50-20261117
- GitHub Pagesの設定は変更していない。公開中の実版は未確認。
- 確定版・旧ブランチ・既存PDF・ユーザーデータを削除／上書きしていない。

## ユーザー確認された未解決不具合（Ver.1.4.49）
1. 調査番号が1つ配置された後も上部「調査番号」ボタンがON色のまま。
2. 普通のオブジェクトはペンで動くが、調査番号ピンは動かない。
3. 「現場書き込み」を上部に配置した際の削除ボタンが赤くない。

## 原因（GitHub現行ソースで確認）
- `survey.js`は1個配置後すでに`setPlace(false)`を実行していた。しかし上部の実ボタンは`surveyPalettePin`であり、`survey-quick-actions.js`は隠れた元ボタン`surveyPinMode`の**click時のみ**状態同期していた。配置後の自動OFFではclickが発生しないため見た目が残っていた。
- `survey.js`のペン長押し認識は調査番号のpointerdown/pointermove/pointerupを捕捉し、移動距離がしきい値を超えても元の編集処理へ渡していなかった。
- 上部の実削除ボタンは`surveyPaletteDelete`。以前のCSS修正は別の隠れた／移動済みボタン`delete`を中心に指定しており、対象を取り違えていた。

## Ver.1.4.50の修正
### 調査番号の自動OFF状態反映
- `survey.js`：`setPlace()`で隠れた元ボタンのaria-pressed／見た目を更新した直後、`survey-placement-changed`カスタムイベントを発行。
- `survey-quick-actions.js`：イベント受信時に上部の実ボタン`surveyPalettePin`のaria-pressed・active・ON/OFF文字・title・aria-labelを同期。
- 1個配置後は`setPlace(false)`となり、上部ボタンも橙→グレーに戻る。ユーザーが再度配置ボタンを押すまでは追加不可。
- 850ms二度押しガード、重複ピン防止は維持。

### 調査番号ピンのペンドラッグ
- `survey.js`のペン650ms長押し判定は保持。
- ペン先が12pxを超えて動いた場合、長押しタイマーを解除し、選択ツールに切り替え、対象調査番号を選択して元の`canvas.onpointerdown`へ入力開始座標を渡す。
- 以降のpointermove/pointerupは元編集エンジンへ通し、既存の座標更新・元に戻す履歴を利用。番号IDと写真・コメントの関係は維持する設計。
- 650ms移動せず長押しすると写真・コメント画面、短くタップすると選択となる処理は維持。

### 上部の実削除ボタンを赤色に
- `survey-layout.css`末尾に上部／フローティング`#surveyPaletteDelete`を対象とした高優先度の赤背景、白文字・白アイコン、赤枠の指定を追加。無効時も赤色。
- 元の操作は`survey-quick-actions.js`から`originalDelete.click()`へ委譲。削除対象や安全確認ロジックを変更しない。
- 過去の`#delete`ボタンCSSはそのまま残す（旧版機能保全）。

## 版とキャッシュ
- index.html：上部／右下ともVer.1.4.50-dev。
- workspace.html：Ver.1.4.50-dev。
- survey.js?v=1.4.50-pin-drag-state
- survey-quick-actions.js?v=1.4.50-toolbar-sync
- survey-layout.css?v=1.4.50-real-delete-red
- sw.js：field-survey-memopad-v1.4.50-pin-drag-toolbar-sync-dev

## 検証済み
- 新ブランチのGitHubソースを更新後再取得し、版表示、ファイル参照、キャッシュ名、3点の修正コードの存在を照合。
- survey.js、survey-quick-actions.js、touch-context-menu.js、tool-dock.js、app.jsのJavaScript構文検査OK。
- 調査番号写真・メモへの長押し／PDF再編集復元／通常オブジェクトドラッグ／複数PDFタブの処理はコード上維持。

## 未検証と留意点
- タブレット実機で上部調査番号ボタンの配置後OFF色反映、押し直すまで再配置不可か。
- ペンで調査番号を選択→スライドしたとき移動できるか。長押し写真・コメントが正常か。
- 上部・浮動の実削除ボタンが赤色になるか、操作確認・削除動作が正常か。
- 全ページ縦スクロール共通倍率、複数PDFタブ切替保持、写真コメント、PDF保存再読込。
- 最新ソースZIP、完全引継ぎ書のライブラリとプロジェクト「ファイル（ソース）」への登録は未実施。GitHub上のドキュメント保存は実施済みだが両保存を意味しない。

## 次の操作
1. ユーザーがPagesを当開発ブランチに変更する。
2. タブレットでVer.1.4.50表示を確認。
3. 調査番号1つ配置→上部ボタンがOFF色に戻るか確認。
4. 調査番号ペン移動、長押し写真画面、上部削除ボタンを一つずつ検証。
5. 不具合があれば調査し次版で修正。承認後、完全版引継ぎ書とソースZIPをLibraryとプロジェクト「ファイル（ソース）」双方に保存。

## 全プロジェクト共通ルール
既存機能、旧版、保存データ、公開範囲を維持。未確認を確認済みと報告しない。旧版削除・上書きや機密情報外部送信は承諾なしで行わない。各版のHTML上部・右下・CSS/JSクエリ・Service Worker・GitHub再取得を照合する。チャット移行前には省略なしの.md引継ぎ書を作成し、保存・ユーザー確認後に新チャットへ移行する。
