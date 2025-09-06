# Firebase Realtime Database 設定とルール

## 問題の原因
デプロイ後のサイトで404エラーが発生する原因は以下の可能性があります：

1. **Firebase Realtime Databaseが有効になっていない**
2. **Database URLが設定されていない**
3. **セキュリティルールが適切に設定されていない**
4. **デプロイ時の設定に問題がある**

## 解決手順

### 1. Firebase Realtime Databaseの有効化
1. https://console.firebase.google.com/ にアクセス
2. プロジェクト「nois-app-add5a」を選択
3. 左メニューから「Realtime Database」を選択
4. 「データベースを作成」をクリック
5. セキュリティルールを選択（後で設定可能）
6. リージョンを選択（asia-northeast1 推奨）

### 2. Database URLの確認
1. Realtime Database画面で「データベースURL」をコピー
2. 通常は `https://nois-app-add5a-default-rtdb.firebaseio.com/` の形式
3. このURLが `firebase/config.ts` の `databaseURL` に設定されているか確認

## 解決方法

### 1. Firebase Console にアクセス
1. https://console.firebase.google.com/ にアクセス
2. プロジェクト「nois-app-add5a」を選択
3. 左メニューから「Realtime Database」を選択
4. 「ルール」タブをクリック

### 2. ルールを以下のように設定

```json
{
  "rules": {
    "messages": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "callRooms": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "test": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### 3. 開発用の一時的なルール（テスト用）
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**注意**: 本番環境では絶対に使用しないでください。セキュリティ上のリスクがあります。

### 4. ルールの説明
- `auth != null`: 認証されたユーザーのみがアクセス可能
- `messages`: メッセージデータの読み書き権限
- `callRooms`: 通話ルームデータの読み書き権限
- `test`: 接続テスト用のデータ

### 5. ルールを公開
1. ルールを入力後、「公開」ボタンをクリック
2. 変更が反映されるまで数分かかる場合があります

## 確認方法
1. ルール設定後、アプリでメッセージ送信を試す
2. コンソールで「Firebase接続テスト成功」が表示されることを確認
3. メッセージ送信が正常に完了することを確認
