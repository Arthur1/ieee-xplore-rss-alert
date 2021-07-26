# ieee-xplore-rss-alert

## claspの導入とログイン

```
# 最新版では依存先の改修の問題でエラーになるためバージョン指定
$ npm install -g @google/clasp@2.3.2
$ exec $SHELL -l
$ clasp login
```

## 準備

### 依存関係のインストール

```
$ yarn
```

### clasp用の設定ファイルの作成

```
$ cp sample.clasp.json .clasp.json
$ vim .clasp.json
```

`.clasp.json` の `{scriptId}` を、GASの「プロジェクトの設定」で確認できる「スクリプトID」に置き換える

```
- {"scriptId":"{scriptId}","rootDir": "src"}
+ {"scriptId":"hogehogefugafuga","rootDir": "src"}
```

## デプロイ

```
$ clasp push
```
