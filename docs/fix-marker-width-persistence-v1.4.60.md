# 現場調査メモパッド Ver.1.4.60-dev 開発引継ぎ追補
更新日：2026-11-24

## 基準と状態
- プロジェクト：現場調査メモパッド開発
- GitHub：stsnwi-AI/field-survey-memopad
- 修正基準：develop/desktop-mouse-pan-v1.4.59-20261124
- 最新開発ブランチ：develop/fix-marker-width-persistence-v1.4.60-20261124
- コード修正対象：app.js、index.html、workspace.html、sw.js
- GitHub Pages：ユーザーがVer.1.4.59でPCのマウス図面移動を動作確認したと報告。本Ver.1.4.60は未公開・未実機検証。

## ユーザーからの不具合報告
マーカー標準値5は確認済み。しかし、1回マーカー線の太さを2へ変更しても、次のマーカー線は標準5に戻る。

## 原因（ソース上で確認）
- 旧app.jsでは`markerWidth`に現在のマーカー描画幅を保持し、専用の「マーカーの太さ」＋／－操作でのみ`setMarkerWidth`を呼んでいた。
- 一方で、描画済みのマーカーを選択して編集パネルの「線の太さ」＋／－で変更した際には、選択オブジェクトの`lineWidth`だけを変更し、次の描画に使う`markerWidth`は変わらなかった。
- その結果、既存線を2にしても、新規線は従来のmarkerWidth=5で生成されていた。

## 修正内容
- `app.js`の`#lineWidth` changeハンドラー：選択対象に`type==='pen'&&markerStroke===true`のマーカーが含まれる場合、編集幅変更後に`setMarkerWidth(v)`を呼ぶ。
- `setMarkerWidth`が既存の専用マーカー幅表示とlocalStorageの保持値を同時に更新する。
- 通常の手書きペンの幅1.0、調査番号、オブジェクト削除、PC拡大縮小、PC移動、iPad操作、マーカー透明度.3、丸い端点は維持。
- 0は既存の選択オブジェクトの編集で使えるが、マーカー新規描画用には幅0を設定せず、現在値を保つ（マーカー専用操作は0.5～10）。

## コミット
- app.js: 79e39935d60fecd7617297077e90a3bde221d85b
- index.html: ba3b78768e0d1159e10c2c3fded756fe4f6b7d27
- workspace.html: f092adfdeef59abb4ef07cc13663692ebf276257
- sw.js: db09676af5d8c87fdc00bc3c7f75b5ade6b8ffc4

## 確認済み
- GitHub修正後再取得：マーカー選択時の幅の同期、localStorage保存、新規マーカーのmarkerWidth利用、Ver.1.4.60画面表示、Service Workerキャッシュ識別子、PCマウス移動の既存コードを確認。
- app.js、page-navigation.jsのJavaScript構文検査合格。

## 未検証・次の作業
- PC／iPad実機で描画済みマーカーの線幅を5→2に変更し、マーカー選択→次の新規線が2で描画されることを確認。
- 専用マーカー幅＋／－で2へ変更した場合の連続線と、再読み込み後の幅保持を確認。
- 写真・コメント・PDF再保存・旧マーカー読込・iPad電子ペン・指動作の回帰確認は未実施。
- 現行公開版からVer.1.4.60ブランチへのGitHub Pages切替はユーザーの判断と操作を必要とする。
- 最新ソースZIP／引継ぎ完全版のLibraryとProject「ファイル（ソース）」保存は未実施。GitHub追補のみ保存。
- 軽量PDFは設計v1.1段階で未実装。

## 全プロジェクト共通ルール
確定版と旧版を保持し、ユーザーの承諾なく削除・上書きしない。機密の外部送信・公開変更・破壊的操作前に承認。確認済／未検証を区別。引継ぎ時はソース最新版・更新日・GitHubブランチ／コミット・仕様・実装機能・承認事項・修正履歴・未解決・検証済／未検証・公開／開発差分・既存機能注意・次作業を省略なしMarkdownで記録し、LibraryとProject双方に保存・ユーザー確認後に移行。
