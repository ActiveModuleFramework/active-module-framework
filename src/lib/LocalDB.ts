/* eslint-disable no-dupe-class-members */
import * as uuid from "uuid/v4";
import { SQLiteDB } from "./SQLiteDB";

/**
 *ローカルDB制御用クラス
 *
 * @export
 * @class LocalDB
 * @extends {SQLiteDB}
 */
export class LocalDB extends SQLiteDB {
  private items: { [key: string]: unknown } = {};
  /**
   *セッション用DBの初期化
   *
   * @memberof LocalDB
   */
  public async initDB(): Promise<void> {
    await this.run(
      "CREATE TABLE IF NOT EXISTS session (id text primary key,type text,date real,server json)"
    );
    await this.run(
      "CREATE INDEX IF NOT EXISTS idx_session_date on session(date)"
    );
    //アイテム用テーブルの作成
    await this.run(
      "CREATE TABLE IF NOT EXISTS app_data (name text primary key,value json)"
    );
    var json = await this.get(
      "select json_group_object(name,json(value)) as value from app_data"
    );
    this.items = JSON.parse(json.value as string);
  }

  /**
   *セッションの開始と関連データの更新
   *
   * @param {string} hash
   * @param {number} expire
   * @returns {Promise<{ hash: string, values: { [key: string]: any }}>}
   * @memberof LocalDB
   */
  public async startSession(type:string,
    hash: string | null,
    expire: number
  ): Promise<{ hash: string; values: { [key: string]: any } }> {
    let id = hash;
    if (id) {
      //一時間経過したセッションを削除
      await this.run(
        "delete from session where date < datetime(current_timestamp , ?||' second') and type=?",
        -expire,type
      );
      //セッションを抽出
      let result = await this.get(
        "select id,server from session where id=? and type=?",
        id,type
      );

      if (result) {
        //セッションの有効時間を延期
        this.run("update session set date = current_timestamp where id=?", id);
        return {
          hash: result.id as string,
          values: JSON.parse(result.server as string)
        };
      }
    }
    return { hash: await this.createSession(type), values: {} };
  }
  /**
   *セッションの終了とデータの保存
   *
   * @param {string} hash
   * @param {{[key:string]:any}} values
   * @returns
   * @memberof LocalDB
   */
  public async endSession(
    hash: string,
    values: { [key: string]: unknown }
  ): Promise<boolean> {
    this.run(
      "update session set date=current_timestamp,server=? where id=?",
      JSON.stringify(values),
      hash
    );
    return true;
  }
  /**
   *セッションの作成
   *
   * @returns
   * @memberof LocalDB
   */
  /**
   *セッションの作成
   *
   * @param {string} type セッションタイプ GLOBAL | SESSION
   * @returns {Promise<string>}
   * @memberof LocalDB
   */
  public async createSession(type:string): Promise<string> {
    var id: string | null = uuid();
    do {
      const result = await this.all("select id from session where id=? and type=?", id,type);
      if (result.length) id = null;
    } while (id === null);
    await this.run(
      "insert into session values(?,?,CURRENT_TIMESTAMP,json_object())",
      id,type
    );
    return id;
  }
  /**
   *セッション用データの設定
   *
   * @param {string} name
   * @param {*} value
   * @memberof LocalDB
   */
  public setItem(
    ...params: [string, unknown] | [{ [key: string]: unknown }]
  ): void {
    if (typeof params[0] === "string") {
      this.items[name] = params[1];
      this.run(
        "replace into app_data values(?,?)",
        name,
        JSON.stringify(params[1])
      );
    } else {
      for (const key of Object.keys(params[0])) {
        const value = params[0][key as keyof typeof params[0]];
        this.items[key] = value;
        this.run(
          "replace into app_data values(?,?)",
          key,
          JSON.stringify(value)
        );
      }
    }
  }
  /**
   *セッション用データの取得
   *
   * @param {string} name
   * @returns {*}
   * @memberof LocalDB
   */
  public getItem(name: string): unknown;
  public getItem<T>(name: string, defValue?: T): T;
  public getItem(name: string, defValue?: unknown): unknown {
    const value = this.items[name];
    if (value) {
      if (typeof defValue === "number" && typeof value === "string")
        return parseInt(value) as typeof defValue;
      return value;
    } else if (defValue !== undefined) return defValue;
    return value;
  }
}
