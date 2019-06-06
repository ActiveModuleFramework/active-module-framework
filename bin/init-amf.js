#!/usr/bin/env node
const execSync = require('child_process').execSync;
console.log("フロントエンドライブラリの初期化中");
execSync("npx init-jwf");
console.log("フロントエンドに必要なパッケージのインストール中");
execSync("npm -D i typescript dts-bundle ts-loader node-sass style-loader sass-loader css-loader url-loader source-map-loader webpack webpack-cli");
const fs = require('fs-extra')
try {
  fs.unlinkSync('dist/public/index.html');
} catch (e) {}
console.log("バックエンド用ファイルのコピー");
fs.copySync('node_modules/active-module-framework/resource', '.')
console.log(
  "ActiveModuleFramework 初期ファイル配置処理完了\n\n"+
  "[使い方]\n"+
  "build-app: npx tsc -b\n"+
  "build-public: npx webpack -b\n"+
  "start: node dist/app/index.js\n")