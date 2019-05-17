import * as sqlite from 'sqlite3';

/**
 *アイテムオブジェクト保存用クラス
 *
 * @export
 * @class SQLiteDB
 */
export class SQLiteDB {
	items:{[key:string]:any}  = {}
	db: sqlite.Database|null = null

	/**
	 *DBを開く
	 *
	 * @param {string} path DBのパス
	 * @returns {Promise<boolean>} true:成功 false:失敗
	 * @memberof SQLiteDB
	 */
	async open(path: string): Promise<boolean> {
		//DBを開く
		const db = await SQLiteDB.openAsync(path)
		if (!db)
			return false
		this.db = db
		//タイムアウト設定
		this.db.configure('busyTimeout', 15000)
		//アイテム用テーブルの作成
		await this.run('CREATE TABLE IF NOT EXISTS app_data (name text primary key,value json)')
		var json = await this.get('select json_group_object(name,json(value)) as value from app_data');
		this.items = JSON.parse(json.value);
		//継承クラスの初期化処理
		await this.initDB()
		return true;
	}
	/**
	 *継承オーバライド用
	 *
	 * @memberof SQLiteDB
	 */
	protected async initDB() { }

	/**
	 *DBを開く
	 *
	 * @private
	 * @static
	 * @param {string} path DBパス
	 * @returns {Promise<sqlite.Database>} DBインスタンス
	 * @memberof SQLiteDB
	 */
	private static openAsync(path: string): Promise<sqlite.Database|null> {
		return new Promise<sqlite.Database|null>((resolve) => {
			new sqlite.Database(path,
				function (this:sqlite.Database,err) {
					if (err) {
						resolve(null)
					} else {
						resolve(this)
					}
				}
			)
		})
	}
	/**
	 *DBを閉じる(継承時処理追加用に非同期)
	 *
	 * @returns true:成功 false :失敗
	 * @memberof SQLiteDB
	 */
	async close() {
		if (!this.db)
			return false
		this.db.close()
		return true
	}
	/**
	 *
	 *
	 * @param {string} name
	 * @param {*} value
	 * @memberof SQLiteDB
	 */
	setItem(name: string, value: any) {
		this.items[name] = value;
		this.run('replace into app_data values(?,?)', name, JSON.stringify(value));
	}
	/**
	 *
	 *
	 * @param {string} name
	 * @returns {*}
	 * @memberof SQLiteDB
	 */
	getItem(name: string): any {
		return this.items[name];
	}
	/**
	 *
	 *
	 * @returns {sqlite.Database}
	 * @memberof SQLiteDB
	 */
	getDB(): sqlite.Database|null {
		return this.db
	}

	/**
	 *SQLiteヘルパークラス
	 *
	 * @param {string} sql
	 * @param {...any} params
	 * @returns {Promise<sqlite.RunResult>}
	 * @memberof SQLiteDB
	 */
	run(sql: string, ...params: any): Promise<sqlite.RunResult> {
		return new Promise<sqlite.RunResult>((resolv, reject) => {
			if (!this.db){
				reject('DB is null')
			}else{
				this.db.run(sql, ...params, function (this: sqlite.RunResult, err: Error | null) {
					if (err)
						reject(err)
					else
						resolv(this)
				});
			}

		})
	}
	/**
	 *
	 *
	 * @param {string} sql
	 * @param {...any} params
	 * @returns {Promise < { [key: string]: any }[] >}
	 * @memberof SQLiteDB
	 */
	all(sql: string, ...params: any): Promise<{ [key: string]: any }[]> {
		return new Promise<{ [key: string]: any }[]>((resolv, reject) => {
			if (!this.db) {
				reject('DB is null')
			} else {
				this.db.all(sql, ...params, function (this: sqlite.RunResult, err: Error | null, rows: any[]) {
					if (err)
						reject(err)
					else {
						resolv(rows)
					}
				});
			}
		})
	}
	/**
	 *
	 *
	 * @param {string} sql
	 * @param {...any} params
	 * @returns {Promise<{ rows: { [key: string]: any }[], statement: sqlite.Statement }>}
	 * @memberof SQLiteDB
	 */
	all2(sql: string, ...params: any): Promise<{ rows: { [key: string]: any }[], statement: sqlite.Statement }> {
		return new Promise<{ rows: { [key: string]: any }[], statement: sqlite.Statement }>((resolv, reject) => {
			if (!this.db) {
				reject('DB is null')
			} else {
				this.db.all(sql, ...params, function (this: sqlite.RunResult, err: Error | null, rows: any[]) {
					if (err)
						reject(err)
					else {
						resolv({ rows: rows, statement: this })
					}
				});
			}

		})
	}
	/**
	 *
	 *
	 * @param {string} sql
	 * @param {...any} params
	 * @returns {Promise<{ [key: string]: any }>}
	 * @memberof SQLiteDB
	 */
	get(sql: string, ...params: any): Promise<{ [key: string]: any }> {
		return new Promise<{ [key: string]: any }>((resolv, reject) => {
			if (!this.db) {
				reject('DB is null')
			} else {
				this.db.get(sql, ...params, function (err: Error, row: any) {
					if (err)
						reject(err)
					else {
						resolv(row)
					}
				});
			}

		})
	}
	/**
	 *
	 *
	 * @param {string} sql
	 * @param {...any} params
	 * @returns {Promise<{ row: { [key: string]: any }, statement: sqlite.Statement }>}
	 * @memberof SQLiteDB
	 */
	get2(sql: string, ...params: any): Promise<{ row: { [key: string]: any }, statement: sqlite.Statement }> {
		return new Promise<{ row: { [key: string]: any }, statement: sqlite.Statement }>((resolv, reject) => {
			if (!this.db) {
				reject('DB is null')
			} else {
				this.db.get(sql, ...params, function (this: sqlite.Statement,err: Error, row: any) {
					if (err)
						reject(err)
					else {
						resolv({ row: row, statement: this })
					}
				});
			}

		})
	}
}