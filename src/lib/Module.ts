import { Manager } from "./Manager";
import { Session } from "./Session";
import { LocalDB } from "./LocalDB";

export interface ModuleInfo {
  className?: string;
  name: string;
  version: number;
  author: string;
  info: string;
}

/**
 *モジュール作成用基本クラス
 *
 * @export
 * @class Module
 */
export class Module {
  public static getModuleInfo(): ModuleInfo {
    return {
      className: this.name,
      name: "Module",
      version: 1,
      author: "",
      info: ""
    };
  }
  public async onStartSession?(): Promise<void>;
  public async onEndSession?(): Promise<void>;
  public static Module: boolean = true;
  private manager: Manager;
  private session: Session | null = null;
  public constructor(manager: Manager) {
    this.manager = manager;
  }
  public getManager(){
    return this.manager;
  }
  public setSession(session: Session): void {
    this.session = session;
  }
  public getSession(): Session {
    if (!this.session) throw "Session Error";
    return this.session;
  }
  public getLocalDB(): LocalDB {
    return this.manager.getLocalDB();
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
  public output(msg: string, ...params: unknown[]): void {
    this.manager.output(msg, ...params);
  }
  public async onCreateModule(): Promise<boolean> {
    return true;
  }
  public async onDestroyModule(): Promise<boolean> {
    return true;
  }

  public getModule<T extends Module>(constructor: {
    new (manager: Manager): T;
  }): Promise<T | null> {
    return this.manager.getModule(constructor);
  }
  public async getSessionModule<T extends Module>(constructor: {
    new (manager: Manager): T;
  }): Promise<T | null> {
    if (!this.session) return null;
    return this.session.getModule(constructor);
  }
}
