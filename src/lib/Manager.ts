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
import { BaseHtml } from "./BaseHtml";

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
  debug: boolean;
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
 *フレームワーク総合管理用クラス
 *
 * @export
 * @class Manager
 */
export class Manager {
  private debug: boolean;
  private localDB: LocalDB = new LocalDB();
  private stderr: string = "";
  private modulesInstance: { [key: string]: Module } = {};
  private modulesType: { [key: string]: typeof Module } = {};
  private express: express.Express;
  private static initFlag = false;
  private commands: {
      [key: string]: (req: express.Request, res: express.Response) => void;
    } = {};

  /**
   *Creates an instance of Manager.
   * @memberof Manager
   */
  public constructor(params: ManagerParams) {
    this.debug = params.debug;
    this.express = express();
    this.output("--- Start Manager");
    //エラーメッセージをキャプチャ
    capcon.startCapture(
      process.stderr,
      (stderr: unknown): void => {
        this.stderr += stderr;
      }
    );
    this.init(params);
  }
  public getModuleTypes() {
    return this.modulesType;
  }
  /**
   *
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
    //ファイルの存在確認
    function isExistFile(path: string): boolean {
      try {
        fs.statSync(path);
      } catch (e) {
        return false;
      }
      return true;
    }

    //ローカルDBを開く
    if (!(await this.localDB.open(params.localDBPath))) {
      // eslint-disable-next-line no-console
      console.error("ローカルDBオープンエラー:%s", params.localDBPath);
      return false;
    }

    //モジュールを読み出す
    let files: string[];
    try {
      files = fs.readdirSync(params.modulePath);
    } catch (e) {
      files = [];
    }
    const modules: { [key: string]: typeof Module } = {};

    for (let ent of files) {
      const dir = fs.statSync(path.join(params.modulePath, ent)).isDirectory();
      let r: {
        [key: string]: typeof Module;
      } | null = null;
      if (!dir) {
        let name = ent;
        let ext = name.slice(-3);
        let ext2 = name.slice(-5);
        if (ext === ".js" || (ext === ".ts" && ext2 !== ".d.ts"))
          r = require(params.modulePath + "/" + name) as {
            [key: string]: typeof Module;
          };
      } else {
        const basePath = `${params.modulePath}/${ent}/`;
        let path: string | null = null;
        for (const name of ["index.ts", "index.js", ent + ".ts", ent + ".js"]) {
          if (isExistFile(basePath + name)) {
            path = basePath + name;
            break;
          }
        }
        if (path)
          r = require(path) as {
            [key: string]: typeof Module;
          };
      }
      if (r) {
        for (const name of Object.keys(r)) {
          if (name === "default") continue;
          const module = r[name];
          if ("Module" in module) {
            modules[name] = module as typeof Module;
          }
        }
      }
    }
    this.modulesType = modules;

    //モジュールの初期化
    for (const name of Object.keys(modules)) {
      this.getModule(name);
    }

    //Expressの初期化
    this.initExpress(params);

    Manager.initFlag = true;
    this.listen(params);
    return true;
  }
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
    await module.onCreateModule();
    return module as T;
  }
  public getModuleSync<T extends Module>(
    type: string | { new (manager: Manager): T }
  ): T | null {
    let name;
    let module;
    if (typeof type === "string") name = type;
    else name = type.name;
    module = this.modulesInstance[name];
    if (module) return module as T;
    return null;
  }
  public addCommand(name:string,proc:(req: express.Request, res: express.Response)=>void){
    this.commands[name] = proc;
  }
  /**
   *Expressの設定を行う
   *
   * @param {string} path				ドキュメントのパス
   * @memberof Manager
   */
  private initExpress(params: ManagerParams): void {
    const commands = this.commands;
    commands.exec = (req: express.Request, res: express.Response): void => {
      this.exec(req, res);
    };
    commands.upload = (req: express.Request, res: express.Response): void => {
      this.upload(req, res);
    };
    //バイナリファイルの扱い設定
    this.express.use(
      bodyParser.raw({ type: "application/octet-stream", limit: "300mb" })
    );
    //一般コンテンツの対応付け
    this.express.use(params.remotePath, express.static(params.rootPath));
    //クライアント接続時の処理
    this.express.all(
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
          }
        } else {
          const path = (req.header("location_path") || "") + params.remotePath;
          if (
            !(await BaseHtml.output(
              res,
              path,
              params.rootPath,
              params.indexPath,
              params.cssPath,
              params.jsPath,
              params.jsPriority
            ))
          )
            next();
        }
      }
    );
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
  private upload(req: express.Request, res: express.Response): void {
    if (req.body instanceof Buffer) {
      const params = req.query.params;
      if(params)
        this.excute(res,JSON.parse(params),req.body);
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
    let postData = "";
    req
      .on("data", function(v: string): void {
        postData += v;
      })
      .on(
        "end",
        (): Promise<void> => {
          return this.excute(res,JSON.parse(postData));
        }
      );
  }
  private async excute(res: express.Response, params: AdapterFormat,buffer?:Buffer) {
    //マネージャ機能をセッション用にコピー
    const session = new Session(this);
    await session.init(
      this.localDB,
      params.globalHash,
      params.sessionHash,
      this.modulesType,
      buffer
    );
    session.result = {
      globalHash: session.getGlobalHash(),
      sessionHash: session.getSessionHash(),
      results: []
    };

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
          this.output("命令実行: %s %s", funcName, JSON.stringify(func.params));
          //戻り値の受け取り
          const funcResult = funcPt.call(classPt, ...func.params);
          result.value = await funcResult;
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
    res.json(session.result);
    res.end();
  }
  //待ち受け設定
  private listen(params: ManagerParams): void {
    let port = 0;
    let path = "";
    if (typeof params.listen === "number") {
      port = params.listen + parseInt(process.env.NODE_APP_INSTANCE || "0");
    } else {
      path = params.listen + "." + (process.env.NODE_APP_INSTANCE || "0");
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
      this.express.listen(
        port,
        (): void => {
          this.output("localhost:%d", port);
          if (params.listened) params.listened(port);
        }
      );
    } else {
      //ソケットファイルの削除
      this.removeSock(path);
      //ソケットの待ち受け設定
      this.express.listen(
        path,
        (): void => {
          this.output(path);
          try {
            fs.chmodSync(path, "666"); //ドメインソケットのアクセス権を設定
            if (params.listened) params.listened(path);
          } catch (e) {
            //
          }
        }
      ); //ソケットの待ち受け設定
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
