// 型付きサーバー関数(RPC 境界)。
//
// クライアントが import できるのはこのファイルまで。ここから先の
// db.ts はサーバー専用で、createServerFn の handler はビルド時に
// クライアントバンドルから除去されるため、node: 依存が漏れることはない。
// 入力は Zod で検証され、入出力の型はそのまま呼び出し側に推論される。

import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { z } from 'zod'
import * as db from '~/server/db'
import type { TodoStats } from '~/types'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const todoListInput = z.object({
  filter: z.enum(['all', 'active', 'completed']),
  sort: z.enum(['created', 'title']),
  q: z.string(),
})

export const getTodos = createServerFn({ method: 'GET' })
  .inputValidator(todoListInput)
  .handler(async ({ data }) => {
    const todos = await db.listTodos()
    const query = data.q.trim().toLowerCase()
    const filtered = todos.filter((todo) => {
      if (data.filter === 'active' && todo.done) return false
      if (data.filter === 'completed' && !todo.done) return false
      if (query && !`${todo.title} ${todo.note}`.toLowerCase().includes(query)) return false
      return true
    })
    filtered.sort((a, b) =>
      data.sort === 'title'
        ? a.title.localeCompare(b.title, 'ja')
        : b.createdAt.localeCompare(a.createdAt),
    )
    return filtered
  })

export const getTodo = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const todo = await db.getTodo(data.id)
    // notFound はシリアライズされて呼び出し元ルートで捕捉される
    if (!todo) throw notFound()
    return todo
  })

export const getTodoStats = createServerFn({ method: 'GET' }).handler(
  async (): Promise<TodoStats> => {
    // ストリーミングを体感できるよう、重い集計を擬似的に再現する
    await sleep(1200)
    return db.todoStats()
  },
)

export const addTodo = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      title: z.string().trim().min(1, 'タイトルは必須です').max(200),
      note: z.string().trim().max(2000).default(''),
    }),
  )
  .handler(({ data }) => db.createTodo(data))

export const setTodoDone = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().min(1), done: z.boolean() }))
  .handler(async ({ data }) => {
    const todo = await db.setTodoDone(data.id, data.done)
    if (!todo) throw notFound()
    return todo
  })

export const deleteTodo = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await db.removeTodo(data.id)
    return { ok: true as const }
  })

export const getServerInfo = createServerFn({ method: 'GET' }).handler(() => ({
  nodeVersion: process.version,
  platform: `${process.platform}/${process.arch}`,
  pid: process.pid,
  uptimeSeconds: Math.round(process.uptime()),
  renderedAt: new Date().toISOString(),
}))
