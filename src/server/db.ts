// サーバー専用のデータ層。バックエンドはランタイムで自動選択される:
//
//   - Cloudflare Workers … D1(SQLite)。cloudflare:workers の env.DB
//     バインディング経由。スキーマとシードは migrations/ を参照。
//   - node(vite dev / node-server)… .data/todos.json へのファイル永続化。
//     FS も使えない環境では最後にインメモリへフォールバック。
//
// クライアントとの境界は二重に守られている:
//  1. node:fs / node:path / node:crypto への静的 import —— クライアント
//     バンドルに紛れ込めばビルドが即座に失敗する。
//  2. createServerOnlyFn —— 万一クライアントで呼び出されても実行時に
//     例外になる。ストアの選択は必ずこのラッパーを通る。
//
// このモジュールを import してよいのは src/server/ 配下
// (createServerFn の handler と Hono の api.ts)だけ。

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { createServerOnlyFn } from '@tanstack/react-start'
import type { Todo, TodoStats } from '~/types'

// ---------------------------------------------------------------------------
// 共通インターフェース
// ---------------------------------------------------------------------------

type TodoStore = {
  list: () => Promise<Array<Todo>>
  get: (id: string) => Promise<Todo | undefined>
  create: (input: { title: string; note: string }) => Promise<Todo>
  setDone: (id: string, done: boolean) => Promise<Todo | undefined>
  remove: (id: string) => Promise<boolean>
}

const newTodo = (input: { title: string; note: string }): Todo => ({
  id: randomUUID(),
  title: input.title,
  note: input.note,
  done: false,
  createdAt: new Date().toISOString(),
})

// ---------------------------------------------------------------------------
// D1 ストア(Cloudflare Workers)
// ---------------------------------------------------------------------------

// @cloudflare/workers-types を tsconfig に入れると DOM の型と衝突するため、
// 使う範囲だけを自前で宣言する。
interface D1PreparedStatement {
  bind: (...values: Array<unknown>) => D1PreparedStatement
  first: <T>() => Promise<T | null>
  all: <T>() => Promise<{ results: Array<T> }>
  run: () => Promise<{ meta: { changes: number } }>
}
interface D1Database {
  prepare: (query: string) => D1PreparedStatement
}

// SQLite に boolean は無いので done は INTEGER (0/1)、日時は ISO 8601 の TEXT
type TodoRow = {
  id: string
  title: string
  note: string
  done: number
  created_at: string
}

const rowToTodo = (row: TodoRow): Todo => ({
  id: row.id,
  title: row.title,
  note: row.note,
  done: row.done === 1,
  createdAt: row.created_at,
})

const getD1 = async (): Promise<D1Database | null> => {
  try {
    // workerd 組み込みモジュール。node には存在しないため import が throw し、
    // 呼び出し側が FS ストアへフォールバックする。@vite-ignore は
    // バンドラーにこの specifier を解決させないための指示。
    const { env } = await import(/* @vite-ignore */ 'cloudflare:workers')
    return (env.DB as D1Database | undefined) ?? null
  } catch {
    return null
  }
}

const d1Store = (db: D1Database): TodoStore => ({
  list: async () => {
    const { results } = await db
      .prepare('SELECT * FROM todos ORDER BY created_at')
      .all<TodoRow>()
    return results.map(rowToTodo)
  },
  get: async (id) => {
    const row = await db
      .prepare('SELECT * FROM todos WHERE id = ?1')
      .bind(id)
      .first<TodoRow>()
    return row ? rowToTodo(row) : undefined
  },
  create: async (input) => {
    const todo = newTodo(input)
    await db
      .prepare('INSERT INTO todos (id, title, note, done, created_at) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(todo.id, todo.title, todo.note, todo.done ? 1 : 0, todo.createdAt)
      .run()
    return todo
  },
  setDone: async (id, done) => {
    // RETURNING で更新後の行がそのまま返る(SQLite / D1 対応)
    const row = await db
      .prepare('UPDATE todos SET done = ?2 WHERE id = ?1 RETURNING *')
      .bind(id, done ? 1 : 0)
      .first<TodoRow>()
    return row ? rowToTodo(row) : undefined
  },
  remove: async (id) => {
    const { meta } = await db.prepare('DELETE FROM todos WHERE id = ?1').bind(id).run()
    return meta.changes > 0
  },
})

// ---------------------------------------------------------------------------
// FS ストア(node)
// ---------------------------------------------------------------------------

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

// FS も使えない環境向けの最終フォールバック。プロセスの寿命までしか残らない。
let memoryStore: Array<Todo> | null = null

const readStore = async (): Promise<Array<Todo>> => {
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
}

const writeStore = async (todos: Array<Todo>) => {
  memoryStore = todos
  try {
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(DATA_FILE, JSON.stringify(todos, null, 2))
  } catch {
    // FS 不可の環境ではメモリのみ
  }
}

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

const fsStore: TodoStore = {
  list: () => readStore(),
  get: async (id) => {
    const todos = await readStore()
    return todos.find((t) => t.id === id)
  },
  create: (input) =>
    mutate((todos) => {
      const todo = newTodo(input)
      todos.push(todo)
      return todo
    }),
  setDone: (id, done) =>
    mutate((todos) => {
      const todo = todos.find((t) => t.id === id)
      if (todo) todo.done = done
      return todo
    }),
  remove: (id) =>
    mutate((todos) => {
      const index = todos.findIndex((t) => t.id === id)
      if (index === -1) return false
      todos.splice(index, 1)
      return true
    }),
}

// ---------------------------------------------------------------------------
// バックエンド選択と公開 API
// ---------------------------------------------------------------------------

let storePromise: Promise<TodoStore> | null = null

const getStore = createServerOnlyFn((): Promise<TodoStore> => {
  storePromise ??= getD1().then((d1) => (d1 ? d1Store(d1) : fsStore))
  return storePromise
})

export const listTodos = async (): Promise<Array<Todo>> => (await getStore()).list()

export const getTodo = async (id: string): Promise<Todo | undefined> =>
  (await getStore()).get(id)

export const createTodo = async (input: { title: string; note: string }): Promise<Todo> =>
  (await getStore()).create(input)

export const setTodoDone = async (id: string, done: boolean): Promise<Todo | undefined> =>
  (await getStore()).setDone(id, done)

export const removeTodo = async (id: string): Promise<boolean> =>
  (await getStore()).remove(id)

export const todoStats = async (): Promise<TodoStats> => {
  const todos = await listTodos()
  const completed = todos.filter((t) => t.done).length
  return {
    total: todos.length,
    active: todos.length - completed,
    completed,
    completionRate: todos.length === 0 ? 0 : Math.round((completed / todos.length) * 100),
  }
}
