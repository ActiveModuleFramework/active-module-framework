import * as amf from 'active-module-framework'
import * as path from 'path'

new amf.Manager({
	remotePath: '/',										//一般コンテンツのリモートパス
	execPath: '/',											//コマンド実行用リモートパス
	indexPath: path.resolve(__dirname, '../template/index.html'),//index.thmlテンプレート
	rootPath: path.resolve(__dirname, '../public'),				//一般コンテンツのローカルパス
	cssPath: ['css'],										//自動ロード用CSSパス
	jsPath: ['js'],											//一般コンテンツのローカルパス
	localDBPath: path.resolve(__dirname, '../db/app.db'),	//ローカルDBパス
	modulePath: path.resolve(__dirname, './modules'),		//モジュール配置パス
	jsPriority: [],											//優先JSファイル設定
	debug: false,											//デバッグ用メッセージ出力
	listen: 8080											//受付ポート/UNIXドメインソケット
	//listen:'dist/sock/app.sock'
})
