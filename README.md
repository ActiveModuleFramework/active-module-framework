# Active Module Framework

## 用途

- Node.js上で動的モジュール形式のWebシステム開発を行うためのフレームワーク


## ライセンス
- MITライセンス 


## 起動方法

- バックエンド側
  - 普通に起動
	```
	npm install
	npm start
	```
  - Windows用batで起動
	```
	start.bat
	```
  - pm2で起動(要pm2のグローバルモジュール)
  	```
	npm install
	pm2 start
	```

- フロントエンド側
	```
	http://localhost:8000/
	```

## 動作ブラウザ
- 一般的なブラウザ(IE11でも動作可能)

## 使用技術

- バックエンド側
	- Node.js 10系統
	- TypeScript 3系統


## ディレクトリ構成

- src (ソースコード)
- lib (トランスコンパイル済みコード)
