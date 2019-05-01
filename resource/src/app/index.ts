import * as amf from 'active-module-framework'

new amf.Manager({
	remotePath: '/',						//一般コンテンツのリモートパス
	execPath: '/',							//コマンド実行用リモートパス
	rootPath: 'dist/public',				//一般コンテンツのローカルパス
	indexPath: 'src/template/index.html',	//index.thmlテンプレート
	cssPath: ['css'],						//自動ロード用CSSパス
	jsPath: ['js'],							//一般コンテンツのローカルパス
	localDBPath: 'dist/db/app.db',			//ローカルDBパス
	modulePath: 'dist/app/modules',			//モジュール配置パス
	jsPriority: ['jsw.js'],					//優先JSファイル設定
	debug: true,							//デバッグ用メッセージ出力
	listen: 8080							//受付ポート/UNIXドメインソケット
	//listen:'dist/sock/app.sock'
})
