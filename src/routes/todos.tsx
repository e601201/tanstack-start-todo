import { Outlet, createFileRoute } from '@tanstack/react-router'

// /todos 配下の共通レイアウト(ネストしたルーティングの親)

export const Route = createFileRoute('/todos')({
  component: TodosLayout,
})

function TodosLayout() {
  return (
    <section>
      <h1>Todo</h1>
      <Outlet />
    </section>
  )
}
