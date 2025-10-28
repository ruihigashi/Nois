<div id="top"></div>

## 使用技術一覧

<p style="display: inline">
  <img src="https://img.shields.io/badge/-React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB">
  <img src="https://img.shields.io/badge/-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white">
  <img src="https://img.shields.io/badge/-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img src="https://img.shields.io/badge/-TailwindCSS-000000.svg?logo=tailwindcss&style=for-the-badge">
  <img src="https://img.shields.io/badge/-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white">
</p>

## 目次

1. [プロジェクトについて](#プロジェクトについて)
2. [環境](#環境)
3. [ディレクトリ構成](#ディレクトリ構成)
4. [開発環境構築](#開発環境構築)

<br />

## プロジェクト名

nois

## プロジェクトについて

WebRTCを利用したリアルタイムコミュニケーションアプリケーションです。

<p align="right">(<a href="#top">トップへ</a>)</p>

## 環境

| 言語・フレームワーク | バージョン |
| --------------------- | ---------- |
| React                 | 18.2.0     |
| Vite                  | 5.3.1      |
| TypeScript            | 5.4.5      |
| Tailwind CSS          | 3.4.7      |
| Firebase              | 12.2.1     |

その他のパッケージのバージョンは `package.json` を参照してください

<p align="right">(<a href="#top">トップへ</a>)</p>

## ディレクトリ構成

```
.
├── firebase-rules.md
├── index.html
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── functions/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
├── public/
│   ├── app-icon.png
│   ├── ... (other assets)
│   └── user-add.png
└── src/
    ├── Answer.tsx
    ├── App.tsx
    ├── Home.tsx
    ├── index.css
    ├── main.tsx
    ├── translate.ts
    ├── vite-env.d.ts
    ├── components/
    │   ├── CallConfirmModal.tsx
    │   ├── ... (other components)
    │   └── SignUp.tsx
    ├── contexts/
    │   ├── AuthContext.tsx
    │   └── WebRTCContext.tsx
    ├── firebase/
    │   └── config.ts
    ├── hooks/
    │   └── useAutoCall.ts
    ├── router/
    │   └── Route.tsx
    └── services/
        ├── CallService.ts
        ├── ... (other services)
        └── userService.ts
```

<p align="right">(<a href="#top">トップへ</a>)</p>

## 開発環境構築

### 必要なもの
* Node.js
* npm

### 手順
1. **パッケージのインストール**
   ```sh
   npm install
   ```

2. **開発サーバーの起動**
   ```sh
   npm run dev
   ```
   http://localhost:5173 で開発サーバーが起動します。

3. **ビルド**
   ```sh
   npm run build
   ```

4. **ビルドのプレビュー**
    ```sh
    npm run preview
    ```

<p align="right">(<a href="#top">トップへ</a>)</p>