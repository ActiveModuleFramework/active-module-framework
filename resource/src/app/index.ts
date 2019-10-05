import * as amf from "active-module-framework";
import * as path from "path";

new amf.Manager({
  remotePath: "/", //一般コンテンツのリモートパス
  execPath: "/", //コマンド実行用リモートパス
  indexPath: path.resolve(__dirname, "../template/index.html"), //index.thmlテンプレート
  rootPath: path.resolve(__dirname, "../public"), //一般コンテンツのローカルパス
  cssPath: ["css"], //自動ロード用CSSパス
  jsPath: ["js"], //一般コンテンツのローカルパス
  localDBPath: path.resolve(__dirname, "../db/app.db"), //ローカルDBパス
  modulePath: path.resolve(__dirname, "./modules"), //モジュール配置パス
  jsPriority: [], //優先JSファイル設定
  cluster:-1, //クラスター使用時のプロセス数(-1:使用しない 0:CPU数 1～:指定した数)
  debug: 2, //デバッグ用メッセージ出力(true|1:送受信全て 2:受信のみ false:出力しない)
  autoReload: true, //ブラウザの自動更新
  test: true, //テストの実行
  listen: 8080 //受付ポート/UNIXドメインソケット
  //listen:'dist/sock/app.sock'
});
