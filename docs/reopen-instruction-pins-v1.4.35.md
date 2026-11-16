# Ver.1.4.35-dev — 指示ピン付きPDF再読込の修正

更新日：2026-11-16

- 基準ブランチ：`develop/restore-edit-controls-horizontal-palette-v1.4.34-20261116`
- このブランチ：`develop/reopen-instruction-pins-v1.4.35-20261116`
- 修正内容：`app.js` の `validClipboardObject()` に `instruction-pin` の４種類（要修正／位置確認／施工済／写真撮影）を追加し、保存済みPDF内の指示ピンを正しく検証する。調査番号の `survey-pin` のID検証は保持する。
- 表示・キャッシュ更新：`index.html` と `sw.js`。
- 原因：Ver.1.4.34では指示ピンの保存が可能でも、復元時に未知の形状として拒否される。
- 検証：構文およびGitHub反映確認。実端末での開封・再保存・再読込は未検証。
- 未着手：右上の指示スタンプ選択肢の重なり、設定パネル側の旧指示スタンプと補助共有の非表示。これらは次のUI修正作業。
- 公開版（main / GitHub Pages）は変更していない。既存ブランチや元PDFを上書き・削除しない。
