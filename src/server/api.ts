// Hono による REST API(学習用の最小構成)。
//
// createServerFn がアプリ内部の型付き RPC を担うのに対し、こちらは
// 「外部クライアントにも公開できる素の HTTP エンドポイント」の置き場。
// マウント方法は src/routes/api.$.ts を参照 —— TanStack Start の
// キャッチオールなサーバールートが /api/* をこの app.fetch に委譲する。
//
// このモジュールは db.ts(サーバー専用)を import するため、
// クライアントから import してはいけない。ルート側では動的 import に
// することでクライアントバンドルへの混入を防いでいる。

import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { z } from 'zod'
import * as db from '~/server/db'

export const api = new Hono().basePath('/api')

// ミドルウェアは use() で横断適用される。ここではリクエストログのみ。
// CORS や Bearer 認証も同じ形で足せる(hono/cors, hono/bearer-auth)。
api.use(logger())

api.get('/health', (c) =>
  c.json({
    ok: true,
    framework: 'hono',
    runtime: typeof process !== 'undefined' ? `node ${process.version}` : 'edge',
  }),
)

api.get('/todos', async (c) => {
  const todos = await db.listTodos()
  // ?done=true / ?done=false でのフィルタ。クエリ取得は c.req.query()。
  const done = c.req.query('done')
  const filtered =
    done === undefined ? todos : todos.filter((t) => t.done === (done === 'true'))
  return c.json(filtered)
})

api.get('/todos/:id', async (c) => {
  const todo = await db.getTodo(c.req.param('id'))
  if (!todo) return c.json({ error: 'todo not found' }, 404)
  return c.json(todo)
})

const createTodoInput = z.object({
  title: z.string().min(1),
  note: z.string().default(''),
})

api.post('/todos', async (c) => {
  const parsed = createTodoInput.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: 'invalid body', issues: parsed.error.issues }, 400)
  }
  const todo = await db.createTodo(parsed.data)
  return c.json(todo, 201)
})

api.delete('/todos/:id', async (c) => {
  const removed = await db.removeTodo(c.req.param('id'))
  if (!removed) return c.json({ error: 'todo not found' }, 404)
  return c.body(null, 204)
})
