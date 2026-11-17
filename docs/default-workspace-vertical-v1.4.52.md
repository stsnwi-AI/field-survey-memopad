# 現場調査メモパッド Ver.1.4.52-dev 開発記録（2026-11-17）

## 起動の確定要求
- 通常起動で複数PDFのタブ画面を開く。
- 最初はPDF1枚を選んで編集できる。後から2枚目を追加しても1枚目のオブジェクト・写真・コメント・履歴を保持する。
- 各PDFのページは縦スクロール連続表示を標準にする。
- 編集後、完全なMarkdown形式の開発引継ぎ書を一度作成する。

## ソースと版
- GitHub：stsnwi-AI/field-survey-memopad
- 直前ブランチ：develop/ui-color-clarity-v1.4.51-20261117
- 本開発ブランチ：develop/default-workspace-vertical-v1.4.52-20261117
- 修正：index.html、workspace.html、manifest.webmanifest、sw.js
- ファイル単位コミット：index bdf52690dafeb7d88eb719756fc0ad69e15fbe59、workspace c4c9df42d83b647c0d9bfe49f059e6c30ad50f44、manifest 112a5ef2450071bb719ba49dd4de505f8af58caa、sw 9b31c48b39bc7196b35e42ce846a6170a24f85ab
- 最新版表示は index上部・右下、workspaceともVer.1.4.52-dev。
- PWA起動先 ./workspace.html。通常indexはworkspaceへリダイレクト。iframe編集は?workspacePane=1で元のindexを使用。明示的新PDF／旧編集用クエリはそのまま残す。
- 旧版、main、従来編集エンジン、ユーザーデータ、PDFは削除・上書きしていない。
- GitHub Pages公開ブランチ切替は未実施、現在公開版との一致は未確認。

## 確認済みと未確認
- GitHub上の関連ファイルを更新後に再取得。起動条件、iframeの再帰リダイレクト回避、manifest、Service Worker、複数PDFと縦連続表示機能の存在、版表示をコードで確認。
- indexとworkspaceのインラインJavaScript構文検査OK。
- iPad/Safari実機での初期起動、ファイル読込、複数PDFへの追加入力・切替、保存と再読込、縦スクロール、全ページ拡大、ペン・調査番号・写真・色設定は未検証。確定版と報告しない。
- 複数PDFの保持は起動中メモリのみ。再起動後のタブ自動復元は未実装。
- 現場実機で調査番号OFF色、ペンドラッグ、削除ボタンの淡赤色をVer.1.4.52にて再検証が必要。

## 正式な引継ぎ書
- ダウンロード用に別途生成：Field_Survey_Memopad_Development_Handover_v1.4.52_20261117.md。
- 旧Ver.1.4.36の包括引継ぎ書全文（同書内にはVer.1.4.34の引継ぎ書を再録）を付録に保持。
- ライブラリ／プロジェクト「ファイル（ソース）」への登録は未実施。最新版ソースZIPも未作成。

## 次の一歩
ユーザー承認でPagesの公開元を本開発ブランチに切替→iPadで1.4.52のタブ画面を確認→1枚目PDFを開く→縦スクロール→2枚目追加→戻って編集データと写真を確認→PDF保存・再読込を検証。ユーザーが開発引継ぎ書を確認し、両保存が済むまで新チャットへの移行完了としない。

## 共通ルール
既存機能を維持。確定版・旧ブランチ・写真・PDF・保存データを無断で消さず、承諾なく外部送信・公開変更しない。事実と推測、ソース上の確認と実機確認を区別。毎版で上部・右下・読み込みキャッシュ・Service Worker・GitHub原本を照合。完全な引継ぎ書をMarkdownで保存し、プロジェクトファイルとライブラリ双方に登録する。