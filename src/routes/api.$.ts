// /api/* を Hono に委譲するキャッチオールなサーバールート。
//
// TanStack Start 側のルーティングはここで終わり、以降のパス解決・
// メソッド分岐・ミドルウェアはすべて Hono(src/server/api.ts)が行う。
// Fetch API の Request/Response をそのまま受け渡すだけなので、
// フレームワーク間の変換層は不要。
//
// Hono アプリはサーバー専用モジュール(db.ts)に依存するため、
// 静的 import ではなく handler 内の動的 import にして、クライアント
// バンドルに混入する余地をなくしている。

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        const { api } = await import('~/server/api')
        return api.fetch(request)
      },
    },
  },
})
