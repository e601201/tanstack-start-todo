import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { getTodo, setTodoDone } from '~/server/functions'

// パスパラメータ → loader → サーバー関数、と型が通しで推論される。
// サーバー関数が throw した notFound() はこのルートで捕捉される。

export const Route = createFileRoute('/todos/$todoId')({
  loader: ({ params }) => getTodo({ data: { id: params.todoId } }),
  notFoundComponent: () => (
    <div className="panel">
      <p>指定された Todo は存在しません。</p>
      <Link to="/todos">一覧に戻る</Link>
    </div>
  ),
  component: TodoDetail,
})

function TodoDetail() {
  const todo = Route.useLoaderData()
  const router = useRouter()
  const setTodoDoneFn = useServerFn(setTodoDone)

  return (
    <div className="panel todo-detail">
      <h2>{todo.title}</h2>
      <p className="meta">
        {todo.done ? '完了' : '未完了'} ·{' '}
        {new Date(todo.createdAt).toLocaleString('ja-JP')}
      </p>
      {todo.note && <p>{todo.note}</p>}
      <div className="actions">
        <button
          type="button"
          onClick={async () => {
            await setTodoDoneFn({ data: { id: todo.id, done: !todo.done } })
            await router.invalidate()
          }}
        >
          {todo.done ? '未完了に戻す' : '完了にする'}
        </button>
        <Link to="/todos">一覧に戻る</Link>
      </div>
    </div>
  )
}
