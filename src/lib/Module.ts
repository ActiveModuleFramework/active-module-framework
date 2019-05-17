import { Manager } from './Manager'
import { Session } from './Session'
/**
 *モジュール作成用基本クラス
 *
 * @export
 * @class Module
 */
export class Module {
	static REQUEST:string[]
	static manager: Manager
	session: Session|null = null
	public static setManager(manager: Manager) { Module.manager = manager; }
	public static getManager(): Manager { return Module.manager }
	public static async onCreateModule(): Promise<boolean> { return true }
	public static async onDestroyModule(): Promise<boolean> { return true }
	public static getLocalDB() { return Module.manager.getLocalDB() }
	public static output(msg: string, ...params:any[]) { Module.manager.output(msg, ...params) }
	public setSession(session: Session): void { this.session = session; }
	public async onStartSession(): Promise<void> { }
	public async onEndSession(): Promise<void> { }
	public getSession(): Session {
		if (!this.session)
			throw ("Session Error")
		return this.session
	}
	public getGlobalItem(name: string, defValue?: any): any { return this.session ? this.session.getGlobalItem(name, defValue):null }
	public setGlobalItem(name: string, value: any): void { if (this.session) this.session.setGlobalItem(name, value) }
	public getSessionItem(name: string, defValue?: any): any { return this.session ? this.session.getSessionItem(name, defValue):null }
	public setSessionItem(name: string, value: any): void { if (this.session) this.session.setSessionItem(name, value) }
	public getModule<T extends Module>(constructor: { new(): T }): Promise<T|null> {
		if (!this.session)
			throw ("Session Error")
		return this.session.getModule(constructor)
	}


}