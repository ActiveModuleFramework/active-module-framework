#!/usr/bin/env node
const execSync = require('child_process').execSync;
execSync("npx init-jwf");
execSync("npm -D i typescript dts-bundle ts-loader node-sass style-loader sass-loader css-loader url-loader source-map-loader webpack webpack-cli");
const fs = require('fs-extra')
try {
  fs.unlinkSync('dist/public/index.html');
} catch (e) {}

fs.copySync('node_modules/active-module-framework/resource', '.')
console.log(
  "ActiveModuleFramework 初期ファイル配置処理完了\n"+
  "build-app: tsc -b\n"+
  "build-public: webpack -b\n"+
  "start: node dist/app/index.js\n")