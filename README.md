# TanStack Start Todo

TanStack Start(v1)による Todo アプリ。フレームワークの主要機能を一通り実装したリファレンス構成。

## 使い方

```bash
npm install
npm run dev     # 開発サーバー (http://localhost:3000)
npm run build   # 本番ビルド (.output/)
npm run start   # 本番サーバー (node .output/server/index.mjs)
npm run check   # 型チェック
```

## 実装している機能と場所

| 機能 | 場所 |
| --- | --- |
| ファイルベースルーティング | `src/routes/`(`routeTree.gen.ts` は自動生成) |
| 検証付き search params | `src/routes/todos.index.tsx` — Zod スキーマを `validateSearch` に直接渡す。`default()` + `catch()` で不正値は既定値へ矯正され、URL は正規形へ 307 リダイレクトされる |
| route loader | `todos.index.tsx`(`loaderDeps` で search と連動)、`todos.$todoId.tsx`(パスパラメータ)、`about.tsx` |
| 型付きサーバー関数 | `src/server/functions.ts` — `createServerFn` + `inputValidator(zod)`。入出力の型が呼び出し側まで推論される。`notFound()` の throw もルートへ伝播 |
| フルドキュメント SSR | `src/routes/__root.tsx` — `shellComponent` が `<html>` 全体をレンダリング(`HeadContent` / `Scripts`) |
| ストリーミング | `todos.index.tsx` — loader が統計の Promise を await せず返し、`<Suspense>` + `<Await>` で受ける。シェル+一覧が先着し、統計チャンクが out-of-order で後着(bot UA には完全な HTML を返す) |
| サーバー専用境界 | `src/server/db.ts` — `node:fs` 等への静的 import(クライアントに混入すればビルド失敗)+ `createServerOnlyFn`(実行時ガード)の二重防御。クライアントが import してよいのは `functions.ts`(RPC 境界)まで |
| ルート別 SSR モード | `/todos` = フル SSR(既定)/ `/about` = `ssr: 'data-only'`(loader はサーバー、HTML はクライアント)/ `/settings` = `ssr: false`(完全クライアント、localStorage を直接使用) |
| デプロイランタイム | `vite.config.ts` の Nitro プラグイン。既定は node-server(`.output/server/index.mjs`)。`NITRO_PRESET=vercel` 等でランタイムだけ差し替え可能 — アプリケーションコードは不変 |

## 構成

```
src/
  router.tsx           ルーター生成 + 既定の NotFound / エラー UI
  types.ts             クライアント・サーバー共有の型
  server/
    db.ts              サーバー専用データ層(.data/todos.json に永続化)
    functions.ts       createServerFn 群(RPC 境界、Zod 検証)
  routes/
    __root.tsx         フルドキュメント SSR シェル
    index.tsx          ホーム
    todos.tsx          /todos レイアウト
    todos.index.tsx    一覧: search params + loader + ストリーミング統計 + 追加/トグル/削除
    todos.$todoId.tsx  詳細: パスパラメータ + notFound
    about.tsx          ssr: 'data-only' のデモ
    settings.tsx       ssr: false のデモ(テーマ設定)
```
