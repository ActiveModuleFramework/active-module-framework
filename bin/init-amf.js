#!/usr/bin/env node
const { spawn } = require('child_process');

console.log("npx init-jwf");
if (process.platform === 'win32') {
  var npx = 'npx.cmd'
} else {
  var npx = 'npx'
}
const proc = spawn(npx, ['init-jwf'], { stdio: 'inherit' });
proc.on('exit', () => {
  const fs = require('fs-extra')
  try {
    fs.unlinkSync('dist/public/index.html');
  } catch (e) { }
  console.log("copy files");
  fs.copySync('node_modules/active-module-framework/resource', '.');
  console.log(
    "-----------------------------\n" +
    "[AMF Build Command]\n" +
    "build-back-end: npx tsc -b\n" +
    "build-front-end: npx webpack -b\n" +
    "start: node dist/app/index.js\n" +
    "-----------------------------");
})
