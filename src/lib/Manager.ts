import * as cluster from "cluster";
import * as os from "os";
import * as fs from "fs";
import * as util from "util";
import * as capcon from "capture-console";
import * as path from "path";
import * as express from "express";
import * as bodyParser from "body-parser";

import { Module } from "./Module";
import { LocalDB } from "./LocalDB";
import { Session } from "./Session";
import { AdapterResult } from "./Session";
import { HtmlCreater } from "./HtmlCreater";

/**
 *マネージャ初期化用パラメータ
 *
 * @export
 * @interface ManagerParams
 * @property {string} rootPath		一般コンテンツのローカルパス
 * @property {string} remotePath	一般コンテンツのリモートパス
 * @property {string} execPath		コマンド実行用リモートパス
 * @property {string} localDBPath	ローカルDBパス
 * @property {string} modulePath	モジュール配置パス
 * @property {string[]} cssPath		自動ロード用CSSパス
 * @property {string[]} jsPath		一般コンテンツのローカルパス
 * @property {string[]} jsPriority	優先JSファイル設定
 * @property {boolean} debug		デバッグ用メッセージ出力
 * @property {number | string} listen	受付ポート/UNIXドメインソケット
 */
export interface ManagerParams {
  rootPath: string;
  remotePath: string;
  execPath: string;
  indexPath: string;
  localDBPath: string;
  modulePath: string;
  cssPath: string[];
  jsPath: string[];
  jsPriority: string[];
  cluster?: number;
  debug?: boolean;
  listen: number | string;
  listened?: (port: string | number) => void;
}
interface AdapterFormat {
  globalHash: string | null; //ブラウザ共通セッションキー
  sessionHash: string | null; //タブ用セッションキー
  functions: //命令格納用
  {
    function: string; //命令
    params: unknown[]; //パラメータ
  }[];
}

/**
 *一時待機用
 *
 * @export
 * @param {number} timeout
 * @returns {Promise<void>}
 */
export function Sleep(timeout: number): Promise<void> {
  return new Promise((resolv): void => {
    setTimeout((): void => {
      resolv();
    }, timeout);
  });
}
/**
 *フレームワーク総合管理用クラス
 *
 * @export
 * @class Manager
 */
export class Manager {
  private debug?: boolean;
  private localDB: LocalDB = new LocalDB();
  private stderr: string = "";
  private modulesInstance: { [key: string]: Module } = {};
  private modulesType: { [key: string]: typeof Module } = {};
  private express?: express.Express;
  private static initFlag = false;
  private commands: {
    [key: string]: (req: express.Request, res: express.Response) => void;
  } = {};

  /**
   *Creates an instance of Manager.
   * @memberof Manager
   */
  public constructor(params: ManagerParams) {
    this.init(params);
  }

  /**
   *モジュールのコンストラクター一覧を返す
   *
   * @returns {{
   *     [key: string]: typeof Module;
   *   }}
   * @memberof Manager
   */
  public getModuleTypes(): {
    [key: string]: typeof Module;
  } {
    return this.modulesType;
  }

  /**
   *デバッグ情報の出力
   *
   * @param {string} msg
   * @param {*} params
   * @memberof Manager
   */
  public output(msg: string, ...params: unknown[]): void {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(msg, ...params);
    }
  }

  /**
   * 初期化処理
   *
   * @param {string} localDBPath	ローカルデータベースパス
   * @param {string} modulePath	モジュールパス
   * @returns {Promise<boolean>}	true:正常終了 false:異常終了
   * @memberof Manager
   */
  public async init(params: ManagerParams): Promise<boolean> {
    if (
      params.cluster !== undefined &&
      params.cluster !== -1 &&
      cluster.isMaster
    ) {
      this.output("親プロセス起動");
      cluster.on("exit", async (worker, code, signal) => {
        console.log(
          "Worker %d died with code/signal %s. Restarting worker...",
          worker.process.pid,
          signal || code
        );
        Sleep(2000); //待機
        //初期化以外の要因なら再起動
        if (code !== -10) cluster.fork();
      });

      //子プロセスを作成
      const numCPUs = params.cluster === 0 ? os.cpus().length : params.cluster;
      for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
      }
    } else {
      this.output("子プロセス起動");
      this.debug = params.debug;
      this.output("--- Start Manager");
      //エラーメッセージをキャプチャ
      capcon.startCapture(process.stderr, (stderr: unknown): void => {
        this.stderr += stderr;
      });
      //ローカルDBを開く
      if (!(await this.localDB.open(params.localDBPath))) {
        // eslint-disable-next-line no-console
        console.error("ローカルDBオープンエラー:%s", params.localDBPath);
        process.exit(-10);
      }

      //モジュールを読み出す
      const modulesType = this.loadModule(params.modulePath);
      this.modulesType = modulesType;

      //モジュールの初期化
      for (const name of Object.keys(modulesType)) {
        if (!(await this.getModule(name))) process.exit(-10);
      }

      //Expressの初期化
      this.initExpress(params);
      Manager.initFlag = true;
    }
    return true;
  }

  /**
   *ディレクトリからモジュールを読み込む
   *
   * @param {string} modulePath
   * @returns
   * @memberof Manager
   */
  public loadModule(modulePath: string) {
    let modulesType: { [key: string]: typeof Module } = {};
    const files = fs.readdirSync(modulePath);
    for (const file of files) {
      const filePath = path.join(modulePath, file);
      const dir = fs.statSync(filePath).isDirectory();
      if (dir) {
        modulesType = Object.assign(modulesType, this.loadModule(filePath));
      } else {
        if (file.match(`\(?<=\.(ts|js))(?<!d\.ts)$`)) {
          const r = require(filePath) as { [key: string]: typeof Module };
          if (r) {
            for (const name of Object.keys(r)) {
              const module = r[name];
              if (module.prototype instanceof Module) {
                modulesType[name] = module;
              }
            }
          }
        }
      }
    }
    return modulesType;
  }

  /**
   *モジュールの取得と新規インスタンスの作成
   *
   * @template T
   * @param {(string | { new (manager: Manager): T })} type
   * @returns {(Promise<T | null>)}
   * @memberof Manager
   */
  public async getModule<T extends Module>(
    type: string | { new (manager: Manager): T }
  ): Promise<T | null> {
    const modules = this.modulesInstance;
    let name;
    let module;
    if (typeof type === "string") name = type;
    else name = type.name;
    module = this.modulesInstance[name];
    if (module) return module as T;
    let constructor = this.modulesType[name];
    if (constructor == null || !("Module" in constructor)) return null;
    module = new constructor(this);
    modules[name] = module;

    const info = constructor.getModuleInfo();
    this.output("init: %s", JSON.stringify(info));
    //初期化に失敗したらnullを返す
    if (!(await module.onCreateModule())) return null;
    return module as T;
  }

  /**
   *非同期を使わずモジュールの取得(未初期化は例外発生)
   *
   * @template T
   * @param {(string | { new (manager: Manager): T })} type
   * @returns {(T | null)}
   * @memberof Manager
   */
  public getModuleSync<T extends Module>(
    type: string | { new (manager: Manager): T }
  ): T | null {
    let name;
    let module;
    if (typeof type === "string") name = type;
    else name = type.name;
    module = this.modulesInstance[name];
    if (module) return module as T;
    throw "Module Load Error";
  }

  /**
   *コマンドの追加
   * /?cmd=コマンド
   * に対応したルーティングを行う
   *
   * @param {string} name
   * @param {(req: express.Request, res: express.Response) => void} proc
   * @memberof Manager
   */
  public addCommand(
    name: string,
    proc: (req: express.Request, res: express.Response) => void
  ): void {
    this.commands[name] = proc;
  }

  /**
   *Expressの設定を行う
   *
   * @param {string} path				ドキュメントのパス
   * @memberof Manager
   */
  private initExpress(params: ManagerParams): void {
    const exp = express();
    const commands = this.commands;
    commands.exec = (req: express.Request, res: express.Response): void => {
      this.exec(req, res);
    };
    commands.upload = (req: express.Request, res: express.Response): void => {
      this.upload(req, res);
    };

    exp.options("*", function(req, res) {
      res.header("Access-Control-Allow-Headers", "content-type");
      res.sendStatus(200);
      res.end();
    });
    //バイナリファイルの扱い設定
    exp.use(
      bodyParser.raw({ type: "application/octet-stream", limit: "300mb" })
    );
    exp.use(bodyParser.json({ type: "application/json", limit: "3mb" }));
    //クライアント接続時の処理
    exp.all(
      params.remotePath,
      async (
        req: express.Request,
        res: express.Response,
        next
      ): Promise<void> => {
        //初期化が完了しているかどうか
        if (!Manager.initFlag) {
          res.header("Content-Type", "text/plain; charset=utf-8");
          res.end(this.stderr);
          return;
        }
        //コマンドパラメータの解析
        const cmd = req.query.cmd as string;
        if (cmd != null) {
          const command = commands[cmd];
          if (command != null) {
            command(req, res);
          } else {
            res.json({ error: "リクエストエラー" });
            res.end();
          }
        } else {
          const path =
            (req.header("location_path") || `https://${req.hostname}`) +
            params.remotePath;
          this.output(path);
          const htmlNode = new HtmlCreater();
          if (
            !htmlNode.output(
              req,
              res,
              path,
              params.rootPath,
              params.indexPath,
              params.cssPath,
              params.jsPath,
              params.jsPriority,
              Object.values(this.modulesInstance)
            )
          )
            next();
        }
      }
    );
    //一般コンテンツの対応付け
    exp.use(params.remotePath, express.static(params.rootPath));

    //待ち受けポートの設定
    let port = 0;
    let path = "";
    if (typeof params.listen === "number") {
      port = params.listen; // + parseInt(process.env.NODE_APP_INSTANCE || "0");
    } else {
      path = params.listen; // + "." + (process.env.NODE_APP_INSTANCE || "0");
    }

    //終了時の処理(Windowsでは動作しない)
    const onExit: NodeJS.SignalsListener = async (): Promise<void> => {
      await this.destory();
      if (path) this.removeSock(path); //ソケットファイルの削除
      process.exit(0);
    };
    process.on("SIGINT", onExit);
    process.on("SIGTERM", onExit);

    if (port) {
      //ソケットの待ち受け設定
      exp.listen(port, (): void => {
        this.output("localhost:%d", port);
        if (params.listened) params.listened(port);
      });
    } else {
      const listen = (flag: boolean) => {
        //ソケットの待ち受け設定
        exp.listen(path, (): void => {
          this.output(path);
          try {
            fs.chmodSync(path, "666"); //ドメインソケットのアクセス権を設定
            if (params.listened) params.listened(path);
          } catch (e) {
            //初回かどうか識別
            if (flag) {
              //ソケットファイルの削除
              this.removeSock(path);
              //リトライ
              listen(false);
            }
          }
        }); //ソケットの待ち受け設定
      };
      listen(true);
    }
  }

  /**
   * 終了処理
   *
   * @memberof Manager
   */
  public async destory(): Promise<void> {
    const promise: Promise<boolean>[] = [];
    const modules = this.modulesInstance;
    for (const name of Object.keys(modules)) {
      const module = modules[name];
      this.output("モジュール解放化:%s", name);
      promise.push(module.onDestroyModule());
    }
    await Promise.all(promise);

    this.output("--- Stop Manager");
  }
  /**
   *ローカルDBを返す
   *
   * @returns {LocalDB} ローカルDB
   * @memberof Manager
   */
  public getLocalDB(): LocalDB {
    return this.localDB;
  }

  /**
   *ファイルのアップロード対処用
   *
   * @private
   * @param {express.Request} req
   * @param {express.Response} res
   * @memberof Manager
   */
  private upload(req: express.Request, res: express.Response): void {
    if (req.body instanceof Buffer) {
      const params = req.query.params;
      try {
        const values = JSON.parse(params);
        if (params) this.excute(res, values, req.body);
      } catch (e) {
        res.status(500);
        res.end("500 error");
      }
    }
  }

  /**
   *モジュール処理の区分け実行
   *
   * @private
   * @param {express.Request} req  リクエスト
   * @param {express.Response} res レスポンス
   * @memberof Manager
   */
  private exec(req: express.Request, res: express.Response): void {
    if (req.header("content-type") === "application/json") {
      this.excute(res, req.body);
    } else {
      let postData = "";
      req
        .on("data", function(v: string): void {
          postData += v;
        })
        .on("end", (): void => {
          try {
            const values = JSON.parse(postData);
            this.excute(res, values);
          } catch (e) {
            res.status(500);
            res.end("500 error");
          }
        });
    }
  }

  /**
   *クライアントからの処理要求を実行
   *
   * @private
   * @param {express.Response} res
   * @param {AdapterFormat} params
   * @param {Buffer} [buffer]
   * @returns {Promise<void>}
   * @memberof Manager
   */
  private async excute(
    res: express.Response,
    params: AdapterFormat,
    buffer?: Buffer
  ): Promise<void> {
    //マネージャ機能をセッション用にコピー
    const session = new Session(this);
    await session.init(
      this.localDB,
      params.globalHash,
      params.sessionHash,
      res,
      buffer
    );
    session.result = {
      globalHash: session.getGlobalHash(),
      sessionHash: session.getSessionHash(),
      results: []
    };

    const modulesType = this.modulesType;

    //セッション初期化処理のあるモジュールを呼び出す
    for (const name of Object.keys(modulesType)) {
      if (modulesType[name].prototype.onStartSession)
        await session.initModule(name);
    }

    if (params.functions) {
      const results = session.result.results;
      //要求された命令の解析と実行
      for (const func of params.functions) {
        const result: AdapterResult = { value: null, error: null };
        results.push(result);

        if (!func.function) {
          result.error = util.format("命令が指定されていない", func.function);
          continue;
        }
        const name = func.function.split(".");
        if (name.length != 2) {
          result.error = util.format(
            "クラス名が指定されていない: %s",
            func.function
          );
          continue;
        }
        const className = name[0];
        //クラスインスタンスを取得
        let classPt = await session.getModule(className);
        if (classPt === null) {
          result.error = util.format("クラスが存在しない: %s", func.function);
          continue;
        }
        //ファンクション名にプレフィックスを付ける
        const funcName = "JS_" + name[1];
        //ファンクションを取得
        const funcPt = classPt[funcName as keyof Module] as Function | null;
        if (!funcPt) {
          result.error = util.format("命令が存在しない: %s", func.function);
          continue;
        }
        if (!func.params) {
          result.error = util.format("パラメータ書式エラー: %s", func.function);
          continue;
        }
        if (funcPt.length !== func.params.length) {
          result.error = util.format(
            "パラメータの数が一致しない: %s",
            func.function
          );
          continue;
        }
        //命令の実行
        try {
          if (this.debug)
            this.output(
              "命令実行: %s %s",
              funcName,
              JSON.stringify(func.params)
            );
          //戻り値の受け取り
          const funcResult = funcPt.call(classPt, ...func.params);
          result.value = await funcResult;
          if (this.debug)
            this.output("実行結果: %s", JSON.stringify(result.value));
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          result.error = util.format("モジュール実行エラー: %s", func.function);
          continue;
        }
      }
      //セッション終了
      session.final();
    }
    //クライアントに返すデータを設定
    if (session.isReturn()) {
      res.json(session.result);
      res.end();
    }
  }

  /**
   *前回のソケットファイルの削除
   *
   * @memberof Main
   */
  private removeSock(path: string): void {
    try {
      fs.unlinkSync(path);
    } catch (e) {
      //
    }
  }
}
