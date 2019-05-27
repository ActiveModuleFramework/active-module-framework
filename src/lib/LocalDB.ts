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
  /**
   *セッション用DBの初期化
   *
   * @memberof LocalDB
   */
  public async initDB(): Promise<void> {
    await this.run(
      "CREATE TABLE IF NOT EXISTS session (id text primary key,date real,server json)"
    );
    await this.run(
      "CREATE INDEX IF NOT EXISTS idx_session_date on session(date)"
    );
  }

  /**
   *
   *
   * @param {string} hash
   * @param {number} expire
   * @returns {Promise<{ hash: string, values: { [key: string]: any }}>}
   * @memberof LocalDB
   */
  public async startSession(
    hash: string,
    expire: number
  ): Promise<{ hash: string; values: { [key: string]: any } }> {
    let id = hash;
    if (id) {
      //一時間経過したセッションを削除
      await this.run(
        "delete from session where date < datetime(current_timestamp , ?||' hour')",
        -expire
      );
      //セッションを抽出
      let result = await this.get(
        "select id,server from session where id=?",
        id
      );
      if (result) {
        return {
          hash: result.id as string,
          values: JSON.parse(result.server as string)
        };
      }
    }
    return { hash: await this.createSession(), values: {} };
  }
  /**
   *
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
   *
   *
   * @returns
   * @memberof LocalDB
   */
  public async createSession(): Promise<string> {
    var id: string | null = uuid();
    do {
      const result = await this.all("select id from session where id=?", id);
      if (result.length) id = null;
    } while (id === null);
    await this.run(
      "insert into session values(?,CURRENT_TIMESTAMP,json_object())",
      id
    );
    return id;
  }
}
