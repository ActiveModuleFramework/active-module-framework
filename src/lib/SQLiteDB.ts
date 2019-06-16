import * as sqlite from "sqlite3";

/**
 *アイテムオブジェクト保存用クラス
 *
 * @export
 * @class SQLiteDB
 */
export class SQLiteDB {
  private db: sqlite.Database | null = null;

  /**
   *DBを開く
   *
   * @param {string} path DBのパス
   * @returns {Promise<boolean>} true:成功 false:失敗
   * @memberof SQLiteDB
   */
  public async open(path: string): Promise<boolean> {
    //DBを開く
    const db = await SQLiteDB.openAsync(path);
    if (!db) return false;
    this.db = db;
    //タイムアウト設定
    this.db.configure("busyTimeout", 15000);
    //継承クラスの初期化処理
    await this.initDB();
    return true;
  }
  /**
   *継承オーバライド用
   *
   * @memberof SQLiteDB
   */
  protected async initDB(): Promise<void> {}

  /**
   *DBを開く
   *
   * @private
   * @static
   * @param {string} path DBパス
   * @returns {Promise<sqlite.Database>} DBインスタンス
   * @memberof SQLiteDB
   */
  private static openAsync(path: string): Promise<sqlite.Database | null> {
    return new Promise<sqlite.Database | null>(
      (resolve): void => {
        new sqlite.Database(path, function(this: sqlite.Database, err): void {
          if (err) {
            resolve(null);
          } else {
            resolve(this);
          }
        });
      }
    );
  }
  /**
   *DBを閉じる(継承時処理追加用に非同期)
   *
   * @returns true:成功 false :失敗
   * @memberof SQLiteDB
   */
  public async close(): Promise<boolean> {
    if (!this.db) return false;
    this.db.close();
    return true;
  }
  /**
   *
   *
   * @returns {sqlite.Database}
   * @memberof SQLiteDB
   */
  public getDB(): sqlite.Database | null {
    return this.db;
  }

  /**
   *SQLiteヘルパークラス
   *
   * @param {string} sql
   * @param {...any} params
   * @returns {Promise<sqlite.RunResult>}
   * @memberof SQLiteDB
   */
  public run(sql: string, ...params: unknown[]): Promise<sqlite.RunResult> {
    return new Promise<sqlite.RunResult>(
      (resolv, reject): void => {
        if (!this.db) {
          reject("DB is null");
        } else {
          this.db.run(sql, ...params, function(
            this: sqlite.RunResult,
            err: Error | null
          ): void {
            if (err) reject(err);
            else resolv(this);
          });
        }
      }
    );
  }
  /**
   *
   *
   * @param {string} sql
   * @param {...any} params
   * @returns {Promise < { [key: string]: any }[] >}
   * @memberof SQLiteDB
   */
  public all(
    sql: string,
    ...params: unknown[]
  ): Promise<{ [key: string]: unknown }[]> {
    return new Promise<{ [key: string]: unknown }[]>(
      (resolv, reject): void => {
        if (!this.db) {
          reject("DB is null");
        } else {
          this.db.all(sql, ...params, function(
            this: sqlite.RunResult,
            err: Error | null,
            rows: { [key: string]: unknown }[]
          ): void {
            if (err) reject(err);
            else {
              resolv(rows);
            }
          });
        }
      }
    );
  }
  /**
   *
   *
   * @param {string} sql
   * @param {...any} params
   * @returns {Promise<{ rows: { [key: string]: any }[], statement: sqlite.Statement }>}
   * @memberof SQLiteDB
   */
  public all2(
    sql: string,
    ...params: unknown[]
  ): Promise<{
    rows: { [key: string]: unknown }[];
    statement: sqlite.Statement;
  }> {
    return new Promise<{
      rows: { [key: string]: unknown }[];
      statement: sqlite.Statement;
    }>(
      (resolv, reject): void => {
        if (!this.db) {
          reject("DB is null");
        } else {
          this.db.all(sql, ...params, function(
            this: sqlite.RunResult,
            err: Error | null,
            rows: { [key: string]: unknown }[]
          ): void {
            if (err) reject(err);
            else {
              resolv({ rows, statement: this });
            }
          });
        }
      }
    );
  }
  /**
   *
   *
   * @param {string} sql
   * @param {...any} params
   * @returns {Promise<{ [key: string]: any }>}
   * @memberof SQLiteDB
   */
  public get(
    sql: string,
    ...params: unknown[]
  ): Promise<{ [key: string]: unknown }> {
    return new Promise<{ [key: string]: unknown}>(
      (resolv, reject): void => {
        if (!this.db) {
          reject("DB is null");
        } else {
          this.db.get(sql, ...params, function(
            err: Error,
            row: { [key: string]: unknown }
          ): void {
            if (err) reject(err);
            else {
              resolv(row);
            }
          });
        }
      }
    );
  }
  /**
   *
   *
   * @param {string} sql
   * @param {...any} params
   * @returns {Promise<{ row: { [key: string]: any }, statement: sqlite.Statement }>}
   * @memberof SQLiteDB
   */
  public get2(
    sql: string,
    ...params: unknown[]
  ): Promise<{
    row: { [key: string]: unknown };
    statement: sqlite.Statement;
  }> {
    return new Promise<{
      row: { [key: string]: unknown };
      statement: sqlite.Statement;
    }>(
      (resolv, reject): void => {
        if (!this.db) {
          reject("DB is null");
        } else {
          this.db.get(sql, ...params, function(
            this: sqlite.Statement,
            err: Error,
            row: { [key: string]: unknown }
          ): void {
            if (err) reject(err);
            else {
              resolv({ row, statement: this });
            }
          });
        }
      }
    );
  }
}
