# 現場調査メモパッド Ver.0.4 試作（2026-11-10）

PDF編集アプリ Ver.3.5.16 をベースにした独立試作です。元PDF編集アプリのファイルを変更しません。

## 番号配置の操作
- 「調査番号を配置」をONにする。
- Windows等のマウス操作：図面上で **右クリック** すると自動採番の番号を配置。配置OFF時は元のオブジェクト右クリックメニューを利用できます。
- スマホ・タブレット：配置ONで図面を **1本指タップ** すると番号を配置。2本指による通常操作とは分離します。
- 「番号を連続配置する」がON（初期状態）なら、001, 002, 003…と連続で配置します。OFFなら1件で配置モードが終了します。
- 一度付けた番号は移動できます。番号削除後の欠番は再使用しません（次番号は既存ピン最大値を優先）。

## 制約・未確認
- 右クリック配置中は元アプリの右クリック・オブジェクトメニューを利用できません。OFFに戻すと復帰します。
- 実機でのタップ、長押し、画面スクロール・ズーム競合、各種PDFの読み込み、端末保存と復元は未検証です。
- 既存のPDF編集に加え、調査番号・写真・施工メモ機能を維持。写真付きPDF一括帳票は未実装です。
- 保存名前空間はVer.0.3を維持して写真・メモを引き継ぎます。元PDF編集アプリのデータの書換えはしません。

## Ver.0.5 採番変更
- 開いたPDFのページ構成内で採番。新規PDF・新規タブは001から開始。
- 全ページ通し／ページ別001スタートを選択可能。
- 採番方式変更で既存ピンをページ順に振り直す場合、確認ダイアログを出す。調査IDを維持。
- 旧形式の写真メモJSONの読み込みは維持。


## Ver.0.6 changes
- New survey pins 24×24 instead of 48×48, centered at original click point. Older pins remain as previously saved; resize them individually if desired.
- Double click survey pin to open modal photo/comment editor. Touch double tap supported outside placement mode. Adding a pin no longer interrupts continuous placement with auto-open.
- Left column tightened, record list collapsed by default, all original PDF editor buttons/fields retained.
- Other PDF editor files app.js/mobile.js/stamps-lines.js unchanged.


## Ver.0.7 右クリックと編集の競合対策 (2026-11-10)

- PCの空白位置を右クリックで番号配置、番号を左ダブルクリックで写真・コメント編集。番号配置ONのままでも編集可。
- 既存の番号上で右クリックしても重ねて新規採番しない。
- スマホのタップ配置／ダブルタップ編集は従来通り。
- 既存のPDF編集ツール／保存機能は変更しない。


## Ver.0.8：書き込みツールバー
書き込みツールを上部へ移動し、右側パレットへ切替・移動ができます。元機能は継承し、実ブラウザーでの確認は未実施です。
