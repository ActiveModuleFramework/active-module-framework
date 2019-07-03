import { LocalDB } from "./LocalDB";
import { Module } from "./Module";
import { Manager } from "./Manager";
import * as express from "express";

export interface AdapterResult {
  value: { [keys: string]: unknown } | null;
  error: string | null;
}
export interface AdapterResultFormat {
  globalHash: string | null; //ブラウザ共通セッションキー
  sessionHash: string | null; //タブ用セッションキー
  results: AdapterResult[];
}

/**
 *セッションデータ管理用クラス
 *
 * @export
 * @class Session
 */
export class Session {
  private static requests: ((session: Session) => {})[] = [];
  private sessionHash: string | null = null;
  private globalHash: string | null = null;
  public result: AdapterResultFormat | null = null;
  private values: { [key: string]: unknown } = {};
  private localDB: LocalDB | null = null;
  private modules: (Module)[] = [];
  private manager: Manager;
  private res?: Express.Response;
  private buffer?: Buffer;
  private returnFlag: boolean = true;
  public constructor(manager: Manager) {
    this.manager = manager;
  }
  public setDefaultReturn(flag: boolean) {
    this.returnFlag = flag;
  }
  public isReturn() {
    return this.returnFlag;
  }
  /**
   *
   *
   * @param {LocalDB} db
   * @param {string} globalHash
   * @param {string} sessionHash
   * @param {{ [key: string]: typeof Module }} moduleTypes
   * @memberof Session
   */
  public async init(
    db: LocalDB,
    globalHash: string | null,
    sessionHash: string | null,
    res: Express.Response,
    buffer?: Buffer
  ): Promise<void> {
    this.localDB = db;
    const global = await db.startSession(
      "GLOBAL",
      globalHash,
      7 * 24 * 60 * 60
    );
    const session = await db.startSession("SESSION", sessionHash, 60 * 60);
    this.globalHash = global.hash;
    this.sessionHash = session.hash;
    this.setValue("GLOBAL_ITEM", global.values);
    this.setValue("SESSION_ITEM", session.values);
    this.res = res;
    this.buffer = buffer;
    await this.request();
  }
  public getResponse() {
    return this.res as express.Response;
  }
  /**
   *
   *
   * @memberof Session
   */
  public async final(): Promise<void> {
    if (this.localDB) {
      if (this.sessionHash)
        await this.localDB.endSession(this.sessionHash, this.getValue(
          "SESSION_ITEM"
        ) as {
          [key: string]: unknown;
        });
      if (this.globalHash)
        await this.localDB.endSession(this.globalHash, this.getValue(
          "GLOBAL_ITEM"
        ) as {
          [key: string]: unknown;
        });
    }
  }
  /**
   *
   *
   * @static
   * @param {(session: Session) => {}} func
   * @memberof Session
   */
  public static addRequest(func: (session: Session) => {}): void {
    Session.requests.push(func);
  }
  /**
   *
   *
   * @returns {string}
   * @memberof Session
   */
  public getSessionHash(): string | null {
    return this.sessionHash;
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
  public setSessionHash(hash: string): void {
    this.sessionHash = hash;
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
  public getGlobalHash(): string | null {
    return this.globalHash;
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
  public setGlobalHash(hash: string): void {
    this.globalHash = hash;
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
  public setResult(value: AdapterResultFormat): AdapterResultFormat {
    return (this.result = value);
  }
  /**
   *
   *
   * @param {string} name
   * @param {*} value
   * @memberof Session
   */
  public setValue(name: string, value: unknown): void {
    this.values[name] = value;
  }
  /**
   *
   *
   * @param {string} name
   * @returns
   * @memberof Session
   */
  public getValue(name: string): unknown {
    return this.values[name];
  }
  /**
   *
   *
   * @param {string} name
   * @param {*} value
   * @memberof Session
   */
  public setGlobalItem(name: string, value: unknown): void {
    var items = this.getValue("GLOBAL_ITEM") as {
      [key: string]: unknown;
    };
    if (!items) {
      items = {};
      this.setValue("GLOBAL_ITEM", items);
    }
    items[name] = value;
  }
  public getGlobalItem(name: string, defValue?: unknown): unknown {
    var items = this.getValue("GLOBAL_ITEM") as {
      [key: string]: unknown;
    };
    if (!items) {
      return null;
    }
    return typeof items[name] === "undefined" ? defValue : items[name];
  }
  public setSessionItem(name: string, value: unknown): void {
    var items = this.getValue("SESSION_ITEM") as {
      [key: string]: unknown;
    };
    if (!items) {
      items = {};
      this.setValue("SESSION_ITEM", items);
    }
    items[name] = value;
  }
  public getSessionItem(name: string, defValue?: unknown): unknown {
    var items = this.getValue("SESSION_ITEM") as {
      [key: string]: unknown;
    };
    if (!items) {
      return null;
    }
    return typeof items[name] === "undefined" ? defValue : items[name];
  }
  public async initModule<T extends Module>(
    type:string
  ): Promise<T | null> {
    try {
      const moduleSrc = this.manager.getModuleSync(type);
      if (!moduleSrc) return null;
      const module = Object.assign(moduleSrc) as T;
      module.setSession(this);
      if (module.onStartSession) await module.onStartSession();
      this.modules.push(module);
      return module;
    } catch (e) {
      return null;
    }
  }
  public getModule<T extends Module>(
    type:
      | ({
          new (manager: Manager): T;
        })
      | string
  ): T {
    if (typeof type === "string") {
      for (let module of this.modules) {
        if (module.constructor.name === type) {
          return module as T;
        }
      }
    } else {
      for (let module of this.modules) {
        if (module instanceof type) {
          return module;
        }
      }
    }
    try {
      const moduleSrc = this.manager.getModuleSync(type);
      if (!moduleSrc) throw("Module not found");
      const module = Object.assign(moduleSrc) as T;
      module.setSession(this);
      this.modules.push(module);
      return module;
    } catch (e) {
      throw("Module not found");
    }
  }
  public async releaseModules(): Promise<void> {
    for (let module of this.modules) {
      if (module.onEndSession) await module.onEndSession();
    }
    this.modules = [];
  }
  public async request(): Promise<void> {
    var p = [];
    for (var i = 0; i < Session.requests.length; i++)
      p.push(Session.requests[i](this));
    await Promise.all(p);
  }
  public getBuffer(): Buffer | undefined {
    return this.buffer;
  }
}
