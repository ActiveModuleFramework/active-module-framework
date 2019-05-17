import * as fs from 'fs'
import * as util from 'util'
import * as capcon from 'capture-console'
import * as path from 'path'
import * as express from 'express'

import { Module } from './Module';
import { LocalDB } from './LocalDB';
import { Session } from './Session';
import { AdapterResult } from './Session';
import { BaseHtml } from './BaseHtml'

interface SessionResult{
	globalHash: string|null
	sessionHash:string|null
	result:any
}

/**
 *マネージャ初期化用パラメータ
 *
 * @export
 * @interface ManagerParams
 * @property {string} rootPath		一般コンテンツのローカルパス
 * @property {string} remotePath	一般コンテンツのリモートパス
 * @property {string} execPath		コマンド実行用リモートパス
 * @property {string} localDBPath	ローカルDBパス
 * @property {string} modulePath	モジュール配置パス
 * @property {string[]} cssPath		自動ロード用CSSパス
 * @property {string[]} jsPath		一般コンテンツのローカルパス
 * @property {string[]} jsPriority	優先JSファイル設定
 * @property {boolean} debug		デバッグ用メッセージ出力
 * @property {number | string} listen	受付ポート/UNIXドメインソケット
 */
export interface ManagerParams {
	rootPath: string
	remotePath: string
	execPath: string
	indexPath:string
	localDBPath: string
	modulePath: string
	cssPath: string[]
	jsPath: string[]
	jsPriority: string[]
	debug: boolean
	listen: number | string
	listened?:((port:string|number)=>void)
}

/**
 *フレームワーク総合管理用クラス
 *
 * @export
 * @class Manager
 */
export class Manager {
	debug:boolean
	localDB: LocalDB = new LocalDB()
	stderr: string = ''
	modules: { [key: string]: typeof Module } = {}
	priorityList: typeof Module[][] = []
	express : express.Express
	static initFlag = false
	/**
	 *Creates an instance of Manager.
	 * @memberof Manager
	 */
	constructor(params:ManagerParams) {
		this.debug = params.debug
		this.express = express()
		this.output('--- Start Manager')
		//エラーメッセージをキャプチャ
		capcon.startCapture(process.stderr, (stderr) => {
			this.stderr += stderr;
		})
		this.init(params)
	}
	/**
	 *
	 *
	 * @param {string} msg
	 * @param {*} params
	 * @memberof Manager
	 */
	output(msg:string,...params:any[]){
		if(this.debug)
			console.log(msg, ...params)
	}
	/**
	 * 初期化処理
	 *
	 * @param {string} localDBPath	ローカルデータベースパス
	 * @param {string} modulePath	モジュールパス
	 * @returns {Promise<boolean>}	true:正常終了 false:異常終了
	 * @memberof Manager
	 */
	async init(params: ManagerParams):Promise<boolean>{
		//ファイルの存在確認
		function isExistFile(path:string) {
			try {
				fs.statSync(path)
			} catch (e) {
				return false
			}
			return true
		}
		//Expressの初期化
		this.initExpress(params)

		//ローカルDBを開く
		if (!await this.localDB.open(params.localDBPath)) {
			console.error("ローカルDBオープンエラー:%s", params.localDBPath)
			return false;
		}

		//モジュールを読み出す
		let files: string[]
		try{
			files = fs.readdirSync(params.modulePath)
		}catch(e){
			files = []
		}
		const modules: { [key: string]: typeof Module } = {};
		for (let ent of files) {
			const dir = fs.statSync(path.join(params.modulePath, ent)).isDirectory()
			let r: {[key:string]:typeof Module}|null = null
			if (!dir){
				let name = ent
				let ext = name.slice(-3)
				let ext2 = name.slice(-5)
				if (ext === '.js' || (ext === '.ts' && ext2 !== '.d.ts'))
					r = require(params.modulePath + '/' + name) as { [key: string]: typeof Module }

			}else{
				const basePath = `${params.modulePath}/${ent}/`
				let path:string|null = null
				for(const name of ['index.ts','index.js',ent+'.ts',ent+'.js']){
					if (isExistFile(basePath + name)){
						path = basePath + name
						break
					}
				}
				if (path)
					r = require(path) as { [key: string]: typeof Module }

			}
			if(r){
				const name = Object.keys(r)[0]
				modules[name] = r[name]
			}

		}
		this.modules = modules;

		//依存関係の重み付け
		const sortList: { key: number, module: typeof Module }[] = [];
		for (let index in modules) {
			const module = modules[index];
			sortList.push({ key: Manager.getPriority(modules, module), module: module })
		}
		sortList.sort(function (a, b) {
			return a.key - b.key;
		})

		//重み付けを配列のキーに変換
		const priorityList: typeof Module[][] = [];
		for (let v of sortList) {
			const key = v.key - 1;
			if (priorityList[key])
				priorityList[key].push(v.module)
			else
				priorityList[key] = [v.module];
		}
		this.priorityList = priorityList;

		//依存関係を考慮して初期化
		let flag = true;
		for (let v in priorityList) {
			let modules = priorityList[v];
			for (let module of modules) {
				if (module.onCreateModule) {
					module.setManager(this)

					try {
						this.output("モジュール初期化:%s", module.name)
						const result = await module.onCreateModule()
						if (!result) {
							console.error("モジュール初期化エラー:%s", module.name)
							flag = false
							break
						}
						if (!flag) {
							Manager.initFlag = false;
							return false;
						}
					} catch (err) {
						console.error("モジュール初期化例外")
						console.error(err);
						Manager.initFlag = false;
						return false;
					}
				}
			}

		}
		Manager.initFlag = true
		this.listen(params)
		return true
	}

	/**
	 *Expressの設定を行う
	 *
	 * @param {string} path				ドキュメントのパス
	 * @memberof Manager
	 */
	initExpress(params: ManagerParams) : void{
		const commands: { [key:string]:(req: express.Request, res: express.Response)=>void} = {};
		commands.exec = (req: express.Request, res: express.Response) => { this.exec(req, res) }
		//一般コンテンツの対応付け
		this.express.use(params.remotePath, express.static(params.rootPath));
		//クライアント接続時の処理
		this.express.all(params.remotePath, async (req, res, next)=>{
			//初期化が完了しているかどうか
			if (!Manager.initFlag) {
				res.header("Content-Type", "text/plain; charset=utf-8")
				res.end(this.stderr)
				return;
			}
			//コマンドパラメータの解析
			const cmd = req.query.cmd as string
			if (cmd != null) {
				const command = commands[cmd]
				if (command != null) {
					command(req, res)
				} else {
					res.json({ error: "リクエストエラー" })
				}
			} else {
				const path = (req.header('location_path') || '') + params.remotePath;
				if (!await BaseHtml.output(res, path,params.rootPath,
					params.indexPath,params.cssPath, params.jsPath, params.jsPriority))
					next()
			}
		})
	}


	/**
	 * 終了処理
	 *
	 * @memberof Manager
	 */
	async destory() {
		const priorityList = this.priorityList;
		for (let i = priorityList.length - 1; i >= 0; i--) {
			const modules = priorityList[i];
			const promise = [];
			for (const module of modules) {
				this.output("モジュール解放化:%s", module.name)
				if (module.onDestroyModule)
					promise.push(module.onDestroyModule())
			}
			await Promise.all(promise);
		}
		this.output('--- Stop Manager');
	}
	/**
	 *
	 *
	 * @private
	 * @static
	 * @param {{ [key: string]: typeof Module }} modules	モジュールリスト
	 * @param {typeof Module} module						モジュールタイプ
	 * @returns {number} 優先度
	 * @memberof Manager
	 */
	private static getPriority(modules: { [key: string]: typeof Module }, module: typeof Module) : number{
		if (module == null)
			return 0;

		const request = module.REQUEST;
		let priority = 1;
		if (!request)
			return priority;
		for (const module2 of request) {
			priority = Math.max(priority, Manager.getPriority(modules, modules[module2]) + 1)
		}
		return priority;
	}
	/**
	 *ローカルDBを返す
	 *
	 * @returns {LocalDB} ローカルDB
	 * @memberof Manager
	 */
	getLocalDB() : LocalDB{
		return this.localDB
	}
	/**
	 *モジュール処理の区分け実行
	 *
	 * @private
	 * @param {express.Request} req  リクエスト
	 * @param {express.Response} res レスポンス
	 * @memberof Manager
	 */
	private exec(req: express.Request, res: express.Response) {
		let postData = "";
		req.on('data', function (v) {
			postData += v;
		}).on('end', async () => {
			const params = JSON.parse(postData);
			//マネージャ機能をセッション用にコピー
			const session = new Session()
			await session.init(this.localDB, params.globalHash, params.sessionHash, this.modules)
			session.result = { globalHash: session.getGlobalHash(), sessionHash: session.getSessionHash(), results: [] };

			if (params.functions) {
				const results = session.result.results
				//要求された命令の解析と実行
				for (const func of params.functions) {
					const result: AdapterResult = { value: null, error: null }
					results.push(result)

					if (!func.function) {
						result.error = util.format("命令が指定されていない", func.function)
						continue
					}
					const name = func.function.split('.');
					if (name.length != 2) {
						result.error = util.format("クラス名が指定されていない: %s", func.function)
						continue
					}
					if (!this.modules[name[0]]) {
						result.error = util.format("クラスが存在しない: %s", func.function)
						continue
					}
					//クラスインスタンスを取得
					const classPt = await session.getModule(this.modules[name[0]])

					//ファンクション名にプレフィックスを付ける
					const funcName = 'JS_' + name[1]
					//ファンクションを取得
					const funcPt = (classPt as any)[funcName] as Function
					if (!funcPt) {
						result.error = util.format("命令が存在しない: %s", func.function)
						continue
					}
					if (!func.params) {
						result.error = util.format("パラメータ書式エラー: %s", func.function)
						continue
					}
					if (funcPt.length !== func.params.length) {
						result.error = util.format("パラメータの数が一致しない: %s", func.function)
						continue
					}
					//命令の実行
					try {
						this.output('命令実行: %s %s', funcName, JSON.stringify(func.params))
						result.value = await funcPt.call(classPt, ...func.params)
						this.output('実行結果: %s', JSON.stringify(result.value))
					} catch (e) {
						console.error(e);
						result.error = util.format("モジュール実行エラー: %s", func.function)
						continue
					}
				}
				//セッション終了
				session.final()
			}
			//クライアントに返すデータを設定
			res.json(session.result)
			res.end()
		});
	}
	//待ち受け設定
	private	listen(params: ManagerParams) {
		let port = 0
		let path:string = ''
		if (typeof params.listen === 'number'){
			port = params.listen + parseInt(process.env.NODE_APP_INSTANCE || '0')
		}else{
			path = params.listen + '.' + (process.env.NODE_APP_INSTANCE || '0')
		}


		//終了時の処理(Windowsでは動作しない)
		const onExit: NodeJS.SignalsListener = async (signal: NodeJS.Signals) => {
			await this.destory()
			if (path)
				this.removeSock(path)	//ソケットファイルの削除
			process.exit(0);
		}
		process.on('SIGINT', onExit)
		process.on('SIGTERM', onExit)

		if (port) {
			//ソケットの待ち受け設定
			this.express.listen(port,()=>{
				this.output('localhost:%d', port)
				if(params.listened)
					params.listened(port)
			})

		} else {
			//ソケットファイルの削除
			this.removeSock(path)
			//ソケットの待ち受け設定
			this.express.listen(path,()=>{
				this.output(path)
				try {
					fs.chmodSync(path, '666')	//ドメインソケットのアクセス権を設定
					if (params.listened)
						params.listened(path)
				} catch (e) { }
			})	//ソケットの待ち受け設定
		}
	}
	/**
	 *前回のソケットファイルの削除
	*
	* @memberof Main
	*/
	removeSock(path:string) {
		try {
			fs.unlinkSync(path)
		} catch (e) { }
	}

}