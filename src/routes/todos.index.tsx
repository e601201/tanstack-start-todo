import { Suspense, useState } from 'react'
import {
  Await,
  Link,
  createFileRoute,
  useRouter,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  addTodo,
  deleteTodo,
  getTodoStats,
  getTodos,
  setTodoDone,
} from '~/server/functions'
import type { TodoFilter, TodoSort } from '~/types'

// search params は Zod で検証する。不正な値は catch で既定値に落ちるので、
// URL を直接書き換えられてもルートは壊れない。
const todosSearchSchema = z.object({
  filter: z.enum(['all', 'active', 'completed']).default('all').catch('all'),
  sort: z.enum(['created', 'title']).default('created').catch('created'),
  q: z.string().default('').catch(''),
})

export const Route = createFileRoute('/todos/')({
  validateSearch: todosSearchSchema,
  // 検証済み search を loader の依存として宣言する。値が変わると再実行される。
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    // 一覧は await してフル SSR に含める。
    // 統計は await せず Promise のまま返す → シェル送出後にストリーミングされる。
    const todos = await getTodos({ data: deps })
    return { todos, stats: getTodoStats() }
  },
  component: TodosPage,
})

const FILTERS: Array<{ value: TodoFilter; label: string }> = [
  { value: 'all', label: 'すべて' },
  { value: 'active', label: '未完了' },
  { value: 'completed', label: '完了' },
]

function TodosPage() {
  const { todos, stats } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()

  const addTodoFn = useServerFn(addTodo)
  const setTodoDoneFn = useServerFn(setTodoDone)
  const deleteTodoFn = useServerFn(deleteTodo)

  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      await addTodoFn({ data: { title, note } })
      setTitle('')
      setNote('')
      await router.invalidate()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="todos-page">
      <form className="panel add-form" onSubmit={handleAdd}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="やることを入力…"
          aria-label="タイトル"
          maxLength={200}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="メモ(任意)"
          aria-label="メモ"
          maxLength={2000}
        />
        <button type="submit" disabled={!title.trim() || saving}>
          {saving ? '追加中…' : '追加'}
        </button>
      </form>

      <div className="panel toolbar">
        <div className="filters" role="tablist">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              from={Route.fullPath}
              search={(prev) => ({ ...prev, filter: f.value })}
              className={search.filter === f.value ? 'chip active' : 'chip'}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <input
          type="search"
          value={search.q}
          onChange={(e) =>
            navigate({
              search: (prev) => ({ ...prev, q: e.target.value }),
              replace: true,
            })
          }
          placeholder="検索…"
          aria-label="検索"
        />
        <select
          value={search.sort}
          onChange={(e) =>
            navigate({
              search: (prev) => ({ ...prev, sort: e.target.value as TodoSort }),
              replace: true,
            })
          }
          aria-label="並び順"
        >
          <option value="created">新しい順</option>
          <option value="title">タイトル順</option>
        </select>
      </div>

      <ul className="panel todo-list">
        {todos.length === 0 && <li className="empty">該当する Todo はありません</li>}
        {todos.map((todo) => (
          <li key={todo.id} className={todo.done ? 'todo done' : 'todo'}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={async (e) => {
                await setTodoDoneFn({ data: { id: todo.id, done: e.target.checked } })
                await router.invalidate()
              }}
              aria-label={`${todo.title} を${todo.done ? '未完了' : '完了'}にする`}
            />
            <Link
              to="/todos/$todoId"
              params={{ todoId: todo.id }}
              className="todo-title"
            >
              {todo.title}
            </Link>
            <button
              type="button"
              className="danger"
              onClick={async () => {
                await deleteTodoFn({ data: { id: todo.id } })
                await router.invalidate()
              }}
            >
              削除
            </button>
          </li>
        ))}
      </ul>

      {/* 統計はストリーミングで後着する。SSR ではシェル+一覧が先に届き、
          この Suspense 境界だけが後から埋まる。 */}
      <Suspense fallback={<div className="panel stats">統計を集計中…</div>}>
        <Await promise={stats}>
          {(s) => (
            <div className="panel stats">
              <span>合計 {s.total}</span>
              <span>未完了 {s.active}</span>
              <span>完了 {s.completed}</span>
              <span>達成率 {s.completionRate}%</span>
            </div>
          )}
        </Await>
      </Suspense>
    </div>
  )
}
