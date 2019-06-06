#!/usr/bin/env node
const fs = require('fs-extra')
fs.copySync('node_modules/active-module-framework/resource', '.')
console.log("ActiveModuleFramework 初期ファイル配置処理完了\nbuild: tsc -b\n  run: node dist/app/index.js")