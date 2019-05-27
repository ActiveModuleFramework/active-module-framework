import * as util from "util";
import * as fs from "fs";
import * as path from "path";
import * as express from "express";
import { sprintf } from "sprintf";

interface FileInfo {
  dir: string;
  name: string;
  date: Date;
}

/**
 *トップページ表示用クラス
 *
 * @export
 * @class BaseHtml
 */
export class BaseHtml {
  /**
   *初期ページの出力
   *
   * @static
   * @param {express.Response} res	レスポンス
   * @param {string[]} cssPath		CSSディレクトリ
   * @param {string[]} jsPath		JSディレクトリ
   * @param {string[]} priorityJs	優先度の高いJSファイル
   * @memberof BaseHtml
   */
  /**
   *初期ページの出力
   *
   * @static
   * @param {express.Response} res	レスポンス
   * @param {string} baseUrl			基本パス
   * @param {string} rootPath			ルートパス
   * @param {string} indexPath		index.htmlテンプレートパス
   * @param {string[]} cssPath		CSSディレクトリ
   * @param {string[]} jsPath			JSディレクトリ
   * @param {string[]} priorityJs		優先度の高いJSファイル
   * @returns
   * @memberof BaseHtml
   */
  public static async output(
    res: express.Response,
    baseUrl: string,
    rootPath: string,
    indexPath: string,
    cssPath: string[],
    jsPath: string[],
    priorityJs: string[]
  ): Promise<boolean> {
    function createJSInclude(files: FileInfo[]): string {
      let s = "";
      for (const file of files) {
        const dir = (file as any).dir;
        s += util.format(
          '\n\t<script type="text/javascript" src="%s/%s"></script>',
          dir,
          file.name
        );
      }
      return s;
    }
    function createCSSInclude(files: FileInfo[]): string {
      let s = "";
      for (const file of files) {
        const dir = (file as any).dir;
        s += util.format(
          '\n\t<link rel="stylesheet" href="%s/%s">',
          dir,
          file.name
        );
      }
      return s;
    }
    //ファイル名に日付情報を追加
    function addDateParam(files: FileInfo[]): void {
      for (const file of files) {
        const date = file.date;
        file.name += sprintf(
          "?ver=%04d%02d%02d%02d%02d%02d",
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate(),
          date.getHours(),
          date.getMinutes(),
          date.getSeconds()
        );
      }
    }

    let html;
    try {
      html = fs.readFileSync(indexPath, "utf-8");
    } catch (e) {
      return false;
    }
    const cssFiles: FileInfo[] = [];
    const jsFiles: FileInfo[] = [];
    //CSSファイルリストの読み込み
    for (let dir of cssPath) {
      try {
        const files = fs.readdirSync(`${rootPath}/${dir}`);
        for (const name of files) {
          if (path.extname(name).toLowerCase() === ".css") {
            const stat = fs.statSync(`${rootPath}/${dir}/${name}`);
            cssFiles.push({ dir, name, date: stat.mtime });
          }
        }
      } catch (e) {
        // continue
      }
    }
    //JSファイルリストの読み込み
    for (let dir of jsPath) {
      try {
        const files = fs.readdirSync(`${rootPath}/${dir}`);
        for (const name of files) {
          if (path.extname(name).toLowerCase() === ".js") {
            const stat = fs.statSync(`${rootPath}/${dir}/${name}`);
            jsFiles.push({ dir, name, date: stat.mtime });
          }
        }
      } catch (e) {
        // continue
      }
    }
    //JSを優先順位に従って並び替え
    jsFiles.sort((a, b):number => {
      const v1 = priorityJs.indexOf(a.name);
      const v2 = priorityJs.indexOf(b.name);
      return v2 - v1;
    });

    //時間情報の追加(キャッシュ対策)
    addDateParam(jsFiles);
    addDateParam(cssFiles);

    const data = html
      .replace("[[SCRIPTS]]", createJSInclude(jsFiles))
      .replace("[[CSS]]", createCSSInclude(cssFiles));
    const links: string[] = [];
    for (const file of cssFiles) {
      const dir = (file as any).dir;
      links.push(`<${baseUrl}${dir}/${file.name}>;rel=preload;as=style;`);
    }
    for (const file of jsFiles) {
      const dir = (file as any).dir;
      links.push(`<${baseUrl}${dir}/${file.name}>;rel=preload;as=script;`);
    }
    res.writeHead(200, {
      "Content-Type": "text/html; charset=UTF-8",
      link: links
    });
    res.end(data);

    return true;
  }
}
