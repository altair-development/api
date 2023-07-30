# altair/api
MongoDBサーバーに接続しアカウントやタスク情報の更新を行うAPIサーバーモジュール。フロントエンドからの各種データ更新・読み取りリクエストに対し必要なデータのみ返却するREST API構成。

- MongoDBサーバー/Redisサーバー接続
- Google OAuth認証
- APIキーを使用してWEBサーバーのクライアント認証
- Node.js(Fw:Express.js)

## How to use
まず最初に下記のコマンドを実行しaltairレポジトリをクローンします。  
※下記手順を実施する前に[altair/docker](https://github.com/altair-development/docker)のリソースを使って各種サーバーが起動していることを確認してください。
```
git clone https://github.com/altair-development/api.git
```
次にapiフォルダに移動します。
```
cd api
```
モジュールの実行に必要なnpmライブラリをインストールします。
```
npm ci
```
下記コマンドを実行し`.env.local`ファイルを`.env`のファイル名でコピーします。
```
COPY .env.local .env
```
`.env`ファイルを開きDB接続情報などの各種環境変数の値を設定します。

下記コマンドを実行しAPIサーバーを起動します。
```
node app
```
下記のようなメッセージが出力されれば正常に起動できていることになります。
```
server listening. PORT:7000
successfully connected to redis.
successfully connected to MongoDB.
```
