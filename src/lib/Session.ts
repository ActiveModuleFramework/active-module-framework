import { LocalDB } from "./LocalDB"
import { Module } from "./Module"

export interface AdapterResultFormat {
	globalHash: string	//ブラウザ共通セッションキー
	sessionHash: string //タブ用セッションキー
	results: { 			//結果データ
		value: {[keys:string]:any}
		error: string
	}[]
}

/**
 *セッションデータ管理用クラス
 *
 * @export
 * @class Session
 */
export class Session {
	static requests: ((session: Session) => {})[] = []
	sessionHash: string
	globalHash: string
	result: AdapterResultFormat
	values: { [key: string]: any }
	localDB: LocalDB
	moduleTypes: { [key: string]: typeof Module }
	modules: Module[] = []
	/**
	 *
	 *
	 * @param {LocalDB} db
	 * @param {string} globalHash
	 * @param {string} sessionHash
	 * @param {{ [key: string]: typeof Module }} moduleTypes
	 * @memberof Session
	 */
	async init(db: LocalDB, globalHash: string, sessionHash: string, moduleTypes: { [key: string]: typeof Module }) {
		this.localDB = db
		this.moduleTypes = moduleTypes
		const global = await db.startSession(globalHash, 96)
		const session = await db.startSession(sessionHash, 1)
		this.globalHash = global.hash
		this.sessionHash = session.hash
		this.values = {}
		this.setValue("GLOBAL_ITEM", global.values)
		this.setValue("SESSION_ITEM", session.values)
		await this.request()
	}
	/**
	 *
	 *
	 * @memberof Session
	 */
	async final() {
		await this.localDB.endSession(this.sessionHash, this.getValue("SESSION_ITEM"))
		await this.localDB.endSession(this.globalHash, this.getValue("GLOBAL_ITEM"))
	}
	/**
	 *
	 *
	 * @static
	 * @param {(session: Session) => {}} func
	 * @memberof Session
	 */
	public static addRequest(func: (session: Session) => {}) {
		Session.requests.push(func);
	}
	/**
	 *
	 *
	 * @returns {string}
	 * @memberof Session
	 */
	public getSessionHash(): string {
		return this.sessionHash
	}
	/**
	 *
	 *
	 * @param {string} hash
	 * @memberof Session
	 */
	/**
	 *
	 *
	 * @param {string} hash
	 * @memberof Session
	 */
	public setSessionHash(hash: string) {
		this.sessionHash = hash
	}
	/**
	 *
	 *
	 * @returns {string}
	 * @memberof Session
	 */
	/**
	 *
	 *
	 * @returns {string}
	 * @memberof Session
	 */
	public getGlobalHash(): string {
		return this.globalHash
	}
	/**
	 *
	 *
	 * @param {string} hash
	 * @memberof Session
	 */
	/**
	 *
	 *
	 * @param {string} hash
	 * @memberof Session
	 */
	public setGlobalHash(hash: string) {
		this.globalHash = hash
	}
	/**
	 *
	 *
	 * @param {string} value
	 * @returns
	 * @memberof Session
	 */
	/**
	 *
	 *
	 * @param {string} value
	 * @returns
	 * @memberof Session
	 */
	public setResult(value: AdapterResultFormat) {
		return this.result = value
	}
	/**
	 *
	 *
	 * @param {string} name
	 * @param {*} value
	 * @memberof Session
	 */
	public setValue(name: string, value) {
		this.values[name] = value
	}
	/**
	 *
	 *
	 * @param {string} name
	 * @returns
	 * @memberof Session
	 */
	public getValue(name: string) {
		return this.values[name]
	}
	/**
	 *
	 *
	 * @param {string} name
	 * @param {*} value
	 * @memberof Session
	 */
	setGlobalItem(name: string, value) {
		var items = this.getValue("GLOBAL_ITEM") as {[key: string]: any}
		if (!items) {
			items = {}
			this.setValue("GLOBAL_ITEM", items)
		}
		items[name] = value
	}
	getGlobalItem(name: string, defValue?) {
		var items = this.getValue("GLOBAL_ITEM") as { [key: string]: any }
		if (!items) {
			return null
		}
		return (typeof items[name] === 'undefined') ? defValue : items[name]
	}
	setSessionItem(name: string, value) {
		var items = this.getValue("SESSION_ITEM") as { [key: string]: any }
		if (!items) {
			items = {}
			this.setValue("SESSION_ITEM", items)
		}
		items[name] = value
	}
	getSessionItem(name: string, defValue?) {
		var items = this.getValue("SESSION_ITEM") as { [key: string]: any }
		if (!items) {
			return null
		}
		return (typeof items[name] === 'undefined') ? defValue : items[name]
	}
	getModuleType<T extends typeof Module>(name): T {
		return this.moduleTypes[name] as T
	}
	async getModule<T extends Module>(constructor: { new(): T }): Promise<T> {
		for (let module of this.modules) {
			if (module instanceof constructor) {
				return module
			}
		}
		try{
			const module = new constructor()
			this.modules.push(module)
			module.setSession(this)
			await module.onStartSession()
			return module
		}catch(e){
			console.error(e)
			console.error("モジュールインスタンスの生成に失敗:"+constructor.name)
			return null
		}
	}
	async releaseModules() {
		for (let module of this.modules) {
			await module.onEndSession()
		}
	}
	async request() {
		var p = [];
		for (var i = 0; i < Session.requests.length; i++)
			p.push(Session.requests[i](this));
		await Promise.all(p);
	}
}