import { Manager } from "./Manager";
import { Session } from "./Session";
import { LocalDB } from "./LocalDB";
/**
 *モジュール作成用基本クラス
 *
 * @export
 * @class Module
 */
export class Module {
  public static REQUEST: string[];
  private static manager: Manager;
  private session: Session | null = null;
  public static setManager(manager: Manager): void {
    Module.manager = manager;
  }
  public static getManager(): Manager {
    return Module.manager;
  }
  public static async onCreateModule(): Promise<boolean> {
    return true;
  }
  public static async onDestroyModule(): Promise<boolean> {
    return true;
  }
  public static getLocalDB(): LocalDB {
    return Module.manager.getLocalDB();
  }
  public static output(msg: string, ...params: unknown[]): void {
    Module.manager.output(msg, ...params);
  }
  public setSession(session: Session): void {
    this.session = session;
  }
  public async onStartSession(): Promise<void> {}
  public async onEndSession(): Promise<void> {}
  public getSession(): Session {
    if (!this.session) throw "Session Error";
    return this.session;
  }
  public getGlobalItem(name: string, defValue?: unknown): unknown {
    return this.session ? this.session.getGlobalItem(name, defValue) : null;
  }
  public setGlobalItem(name: string, value: unknown): void {
    if (this.session) this.session.setGlobalItem(name, value);
  }
  public getSessionItem(name: string, defValue?: unknown): unknown {
    return this.session ? this.session.getSessionItem(name, defValue) : null;
  }
  public setSessionItem(name: string, value: unknown): void {
    if (this.session) this.session.setSessionItem(name, value);
  }
  public getModule<T extends Module>(constructor: {
    new (): T;
  }): Promise<T | null> {
    if (!this.session) throw "Session Error";
    return this.session.getModule(constructor);
  }
}
export declare interface Module {
  [key: string]: unknown;
}
