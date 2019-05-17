import { LocalDB } from "./LocalDB"
import { Module } from "./Module"

export interface AdapterResult {
	value: { [keys: string]: any } | null
	error: string | null
}
export interface AdapterResultFormat {
	globalHash: string|null	//ブラウザ共通セッションキー
	sessionHash: string|null //タブ用セッションキー
	results: AdapterResult[]
}

/**
 *セッションデータ管理用クラス
 *
 * @export
 * @class Session
 */
export class Session {
	static requests: ((session: Session) => {})[] = []
	sessionHash: string|null = null
	globalHash: string|null = null
	result: AdapterResultFormat|null = null
	values: { [key: string]: any } = {}
	localDB: LocalDB|null = null
	moduleTypes: { [key: string]: typeof Module } = {}
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
		if (this.localDB){
			if (this.sessionHash)
				await this.localDB.endSession(this.sessionHash, this.getValue("SESSION_ITEM"))
			if (this.globalHash)
				await this.localDB.endSession(this.globalHash, this.getValue("GLOBAL_ITEM"))
		}

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
	public getSessionHash(): string|null {
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
	public getGlobalHash(): string|null {
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
	public setValue(name: string, value:any) {
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
	setGlobalItem(name: string, value:any) {
		var items = this.getValue("GLOBAL_ITEM") as {[key: string]: any}
		if (!items) {
			items = {}
			this.setValue("GLOBAL_ITEM", items)
		}
		items[name] = value
	}
	getGlobalItem(name: string, defValue?:any) {
		var items = this.getValue("GLOBAL_ITEM") as { [key: string]: any }
		if (!items) {
			return null
		}
		return (typeof items[name] === 'undefined') ? defValue : items[name]
	}
	setSessionItem(name: string, value:any) {
		var items = this.getValue("SESSION_ITEM") as { [key: string]: any }
		if (!items) {
			items = {}
			this.setValue("SESSION_ITEM", items)
		}
		items[name] = value
	}
	getSessionItem(name: string, defValue?:any) {
		var items = this.getValue("SESSION_ITEM") as { [key: string]: any }
		if (!items) {
			return null
		}
		return (typeof items[name] === 'undefined') ? defValue : items[name]
	}
	getModuleType<T extends typeof Module>(name:string): T {
		return this.moduleTypes[name] as T
	}
	async getModule<T extends Module>(constructor: { new(): T }): Promise<T|null> {
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