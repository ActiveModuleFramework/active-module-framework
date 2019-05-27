import { LocalDB } from "./LocalDB";
import { Module } from "./Module";

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
  private moduleTypes: { [key: string]: typeof Module } = {};
  private modules: Module[] = [];
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
    globalHash: string,
    sessionHash: string,
    moduleTypes: { [key: string]: typeof Module }
  ): Promise<void> {
    this.localDB = db;
    this.moduleTypes = moduleTypes;
    const global = await db.startSession(globalHash, 96);
    const session = await db.startSession(sessionHash, 1);
    this.globalHash = global.hash;
    this.sessionHash = session.hash;
    this.setValue("GLOBAL_ITEM", global.values);
    this.setValue("SESSION_ITEM", session.values);
    await this.request();
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
  public getModuleType<T extends typeof Module>(name: string): T {
    return this.moduleTypes[name] as T;
  }
  public async getModule<T extends Module>(constructor: {
    new (): T;
  }): Promise<T | null> {
    for (let module of this.modules) {
      if (module instanceof constructor) {
        return module;
      }
    }
    try {
      const module = new constructor();
      this.modules.push(module);
      module.setSession(this);
      await module.onStartSession();
      return module;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      // eslint-disable-next-line no-console
      console.error("モジュールインスタンスの生成に失敗:" + constructor.name);
      return null;
    }
  }
  public async releaseModules(): Promise<void> {
    for (let module of this.modules) {
      await module.onEndSession();
    }
  }
  public async request(): Promise<void> {
    var p = [];
    for (var i = 0; i < Session.requests.length; i++)
      p.push(Session.requests[i](this));
    await Promise.all(p);
  }
}
