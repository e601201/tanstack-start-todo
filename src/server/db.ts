// サーバー専用のデータ層。
//
// この境界は二重に守られている:
//  1. node:fs / node:path / node:crypto への静的 import —— クライアント
//     バンドルに紛れ込めばビルドが即座に失敗する。
//  2. createServerOnlyFn —— 万一クライアントで呼び出されても実行時に
//     例外になる。ストアへの読み書きは必ずこのラッパーを通る。
//
// このモジュールを import してよいのは src/server/ 配下
// (createServerFn の handler)だけ。

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { createServerOnlyFn } from '@tanstack/react-start'
import type { Todo, TodoStats } from '~/types'

const DATA_DIR = path.join(process.cwd(), '.data')
const DATA_FILE = path.join(DATA_DIR, 'todos.json')

const seedTodos = (): Array<Todo> => [
  {
    id: randomUUID(),
    title: 'TanStack Start のルートを眺める',
    note: 'src/routes/ がファイルベースルーティングの入口。',
    done: true,
    createdAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
  },
  {
    id: randomUUID(),
    title: 'search params のバリデーションを試す',
    note: '/todos?filter=active&q=... を書き換えると Zod が検証する。',
    done: false,
    createdAt: new Date(Date.now() - 86400_000).toISOString(),
  },
  {
    id: randomUUID(),
    title: 'ストリーミング SSR を確認する',
    note: '統計パネルは loader が await しない Promise として返り、後から流れてくる。',
    done: false,
    createdAt: new Date().toISOString(),
  },
]

// ファイルシステムを持たないランタイム(Cloudflare Workers 等)では
// インメモリにフォールバックする。永続化はプロセス(isolate)の寿命まで。
let memoryStore: Array<Todo> | null = null

const readStore = createServerOnlyFn(async (): Promise<Array<Todo>> => {
  try {
    const raw = await readFile(DATA_FILE, 'utf8')
    return JSON.parse(raw) as Array<Todo>
  } catch {
    if (memoryStore) return memoryStore
    const todos = seedTodos()
    try {
      await mkdir(DATA_DIR, { recursive: true })
      await writeFile(DATA_FILE, JSON.stringify(todos, null, 2))
    } catch {
      memoryStore = todos
    }
    return todos
  }
})

const writeStore = createServerOnlyFn(async (todos: Array<Todo>) => {
  memoryStore = todos
  try {
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(DATA_FILE, JSON.stringify(todos, null, 2))
  } catch {
    // FS 不可の環境ではメモリのみ
  }
})

// 書き込みはプロセス内で直列化し、read-modify-write の競合を防ぐ
let writeQueue: Promise<unknown> = Promise.resolve()

const mutate = <T>(fn: (todos: Array<Todo>) => T | Promise<T>): Promise<T> => {
  const next = writeQueue.then(async () => {
    const todos = await readStore()
    const result = await fn(todos)
    await writeStore(todos)
    return result
  })
  writeQueue = next.catch(() => {})
  return next
}

export const listTodos = (): Promise<Array<Todo>> => readStore()

export const getTodo = async (id: string): Promise<Todo | undefined> => {
  const todos = await readStore()
  return todos.find((t) => t.id === id)
}

export const createTodo = (input: { title: string; note: string }): Promise<Todo> =>
  mutate((todos) => {
    const todo: Todo = {
      id: randomUUID(),
      title: input.title,
      note: input.note,
      done: false,
      createdAt: new Date().toISOString(),
    }
    todos.push(todo)
    return todo
  })

export const setTodoDone = (id: string, done: boolean): Promise<Todo | undefined> =>
  mutate((todos) => {
    const todo = todos.find((t) => t.id === id)
    if (todo) todo.done = done
    return todo
  })

export const removeTodo = (id: string): Promise<boolean> =>
  mutate((todos) => {
    const index = todos.findIndex((t) => t.id === id)
    if (index === -1) return false
    todos.splice(index, 1)
    return true
  })

export const todoStats = async (): Promise<TodoStats> => {
  const todos = await readStore()
  const completed = todos.filter((t) => t.done).length
  return {
    total: todos.length,
    active: todos.length - completed,
    completed,
    completionRate: todos.length === 0 ? 0 : Math.round((completed / todos.length) * 100),
  }
}
