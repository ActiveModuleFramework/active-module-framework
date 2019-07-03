import { Manager } from "./Manager";
import { Session } from "./Session";
import { LocalDB } from "./LocalDB";
import { HtmlCreater } from "./HtmlCreater";
import * as express from "express";

export interface ModuleInfo {
  className?: string;
  name: string;
  version: number;
  author: string;
  info: string;
}
export interface ModuleMap {
  [key: string]: unknown[];
}
/**
 *モジュール作成用基本クラス
 *
 * @export
 * @class Module
 */
export class Module<T extends ModuleMap = ModuleMap> {
  private listeners: {
    [key: string]: unknown[];
  } = {};
  public static Module: boolean = true;
  private manager: Manager;
  private session: Session | null = null;

  /**
   *モジュールの情報を返す
   *モジュール追加時にオーバライドして情報を書き換える
   *
   * @static
   * @returns {ModuleInfo}
   * @memberof Module
   */
  public static getModuleInfo(): ModuleInfo {
    return {
      className: this.name,
      name: "Module",
      version: 1,
      author: "",
      info: ""
    };
  }
  /**
   *Creates an instance of Module.
   * @param {Manager} manager
   * @memberof Module
   */
  public constructor(manager: Manager) {
    this.manager = manager;
  }
  /**
   *モジュール対応イベントの追加
   *
   * @template K
   * @param {(K & string)} name
   * @param {(...params: T[K]) => void} proc
   * @returns {void}
   * @memberof Module
   */
  public addEventListener<K extends keyof T>(
    name: K & string,
    proc: (...params: T[K]) => void
  ): void {
    const listener = this.listeners[name];
    if (!listener) {
      this.listeners[name as string] = [proc];
      return;
    }
    if (listener.indexOf(proc) >= 0) return;
    listener.push(proc);
  }

  /**
   *モジュール対応イベントの削除
   *
   * @template K
   * @param {(K & string)} name
   * @param {(...params: T[K]) => void} proc
   * @returns {void}
   * @memberof Module
   */
  public removeEventListener<K extends keyof T>(
    name: K & string,
    proc: (...params: T[K]) => void
  ): void {
    const listener = this.listeners[name];
    if (!listener) {
      this.listeners[name as string] = [proc];
      return;
    }
    const index = listener.indexOf(proc);
    if (index < 0) return;
    listener.splice(index, 1);
  }
  /**
   *イベントを呼び出す
   *
   * @template K
   * @param {(K & string)} name
   * @param {...T[K]} params
   * @memberof Module
   */
  public callEvent<K extends keyof T>(name: K & string, ...params: T[K]): void {
    const listener = this.listeners[name];
    if (listener) {
      for (const proc of listener) {
        (proc as ((...params: T[K]) => unknown))(...params);
      }
    }
  }
  /**
   *トップページ生成時のカスタマイズ用
   *
   * @param {HtmlCreater} creater
   * @returns {Promise<void>}
   * @memberof Module
   */
  public async onCreateHtml?(creater: HtmlCreater): Promise<void>;

  /**
   *セッション開始時に必ず呼び出される
   *
   * @returns {Promise<void>}
   * @memberof Module
   */
  public async onStartSession?(): Promise<void>;

  /**
   *セッション終了時に必ず呼び出される
   *
   * @returns {Promise<void>}
   * @memberof Module
   */
  public async onEndSession?(): Promise<void>;

  /**
   *
   *
   * @returns {Manager}
   * @memberof Module
   */
  public getManager(): Manager {
    return this.manager;
  }
  /**
   *
   *
   * @param {Session} session
   * @memberof Module
   */
  public setSession(session: Session): void {
    this.session = session;
  }
  /**
   *
   *
   * @returns {express.Response}
   * @memberof Module
   */
  public getResponse():express.Response{
    return this.getSession().getResponse();
  }
  /**
   *
   *
   * @returns {Session}
   * @memberof Module
   */
  public getSession(): Session {
    if (!this.session) throw "Session Error";
      //return null as unknown as Session;
    return this.session;
  }
  /**
   *
   *
   * @param {boolean} flag
   * @memberof Module
   */
  public setReturn(flag:boolean){
    if(this.session)
      this.session.setDefaultReturn(flag);
  }
  /**
   *
   *
   * @returns {LocalDB}
   * @memberof Module
   */
  public getLocalDB(): LocalDB {
    return this.manager.getLocalDB();
  }
  /**
   *
   *
   * @param {string} name
   * @param {unknown} [defValue]
   * @returns {unknown}
   * @memberof Module
   */
  public getGlobalItem(name: string, defValue?: unknown): unknown {
    return this.session ? this.session.getGlobalItem(name, defValue) : null;
  }
  /**
   *
   *
   * @param {string} name
   * @param {unknown} value
   * @memberof Module
   */
  public setGlobalItem(name: string, value: unknown): void {
    if (this.session) this.session.setGlobalItem(name, value);
  }
  /**
   *
   *
   * @param {string} name
   * @param {unknown} [defValue]
   * @returns {unknown}
   * @memberof Module
   */
  public getSessionItem(name: string, defValue?: unknown): unknown {
    return this.session ? this.session.getSessionItem(name, defValue) : null;
  }
  /**
   *
   *
   * @param {string} name
   * @param {unknown} value
   * @memberof Module
   */
  public setSessionItem(name: string, value: unknown): void {
    if (this.session) this.session.setSessionItem(name, value);
  }
  /**
   *
   *
   * @param {string} msg
   * @param {...unknown[]} params
   * @memberof Module
   */
  public output(msg: string, ...params: unknown[]): void {
    this.manager.output(msg, ...params);
  }
  /**
   *
   *
   * @returns {Promise<boolean>}
   * @memberof Module
   */
  public async onCreateModule(): Promise<boolean> {
    return true;
  }
  /**
   *
   *
   * @returns {Promise<boolean>}
   * @memberof Module
   */
  public async onDestroyModule(): Promise<boolean> {
    return true;
  }

  /**
   *セッション情報を含まないモジュールインスタンスの取得
   *返ってくる値はPromiseなので注意
   * @template T
   * @param {{
   *     new (manager: Manager): T;
   *   }} constructor
   * @returns {(Promise<T | null>)}
   * @memberof Module
   */
  public getModule<T extends Module>(constructor: {
    new (manager: Manager): T;
  }): Promise<T | null> {
    return this.manager.getModule(constructor);
  }

  /**
   *セッション情報を含んだモジュールインスタンスの取得
   *JS_*の命令以降で使用しないとエラーになる
   * @template T
   * @param {{
   *     new (manager: Manager): T;
   *   }} constructor
   * @returns {T}
   * @memberof Module
   */
  public getSessionModule<T extends Module>(constructor: {
    new (manager: Manager): T;
  }):T {
    return this.getSession().getModule(constructor);
  }

  /**
   *カスタムコマンドの追加
   *  /?cmd=コマンド
   *上記に対応した専用機能が追加できる
   * @param {string} name
   * @param {(req: express.Request, res: express.Response) => void} proc
   * @memberof Module
   */
  public addCommand(
    name: string,
    proc: (req: express.Request, res: express.Response) => void
  ): void {
    this.getManager().addCommand(name, proc);
  }

  /**
   *クライアントに通常データを戻すか指定する
   *特殊なデータを戻す場合はfalseを設定する
   *この機能は単独命令実行でしか使えないので注意すること
   * @param {boolean} flag true:通常 false:カスタマイズ
   * @memberof Module
   */
  public setDefaultReturn(flag:boolean){
    this.getSession().setDefaultReturn(flag);
  }
}
