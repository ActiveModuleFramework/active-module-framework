# Active Module Framework

## 用途

- Node.js上で動的モジュール形式のWebシステム開発を行うためのフレームワーク
- フロントエンドとバックエンドの通信を最小限の記述で実現できます

## 更新履歴

- 2019/06/26 0.0.17 HTMLテンプレートの仕様を変更、モジュール仕様の変更
- 2019/06/06 0.0.16 サンプルをJWFモジュールに変更
- 2019/05/17 0.0.09 初期化完了時のコールバックを追加
- 2019/05/15 0.0.07 モジュールのパスの扱いを変更
- 2019/05/07 0.0.02 添付しているフロントエンドサンプルの修正
- 2019/05/02 0.0.01 初期バージョンリリース

## ソースコード

- [https://github.com/ActiveModuleFramework/active-module-framework](https://github.com/ActiveModuleFramework/active-module-framework)

## 動作ブラウザ

- 一般的なブラウザ(IE11でも動作可能)

## 使用技術

- Node.js 10系統
- TypeScript 3系統
  
## 使い方

- 参考URL  

 [https://croud.jp/?p=592](https://croud.jp/?p=592)  
  
- 初期ファイルの設置

```.sh
npx init-amf
```

- Build-app(back-end)

```.sh
npx tsc -b
```

- Build-public(front-end)

```.sh
npx webpack -b
```

- Watch
  
```.sh
npx tsc -b -w
npx webpack -b -w
```

- 起動(起点ファイル)

```.sh
node dist/app/index.js
```

- 動作確認用初期アドレス

```.sh
http://localhost:8080/
```

## 初期ファイル設置後のディレクトリ構成

- /
  - dist (出力ファイルディレクトリ)
    - app (バックエンド用コンパイル済みディレクトリ)
      - modules (コンパイル済みモジュール)
    - db (ローカルデータベース用ディレクトリ)
    - public (フロントエンド用ファイルディレクトリ)
    - sock (UNIXドメインソケット用ディレクトリ) 
  - src (ソースコード類)
    - app (バックエンド用プログラムソース)
      - index.ts (バックエンド初期パラメータ設定用)
    - modules (モジュールフォルダ)
    - public (フロントエンド用ディレクトリ)
  
基本的に編集するのは**src**ディレクトリ内のファイルとなります  

nginxと連携させる場合、UNIXドメインソケットはsockに入っています  
また、nginxから**dist/public**を直接参照するように設定しておけば、Node.jsの負荷が減ります

## ライセンス

- MITライセンス  
