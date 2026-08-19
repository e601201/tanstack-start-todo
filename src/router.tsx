import { Link, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

function NotFound() {
  return (
    <div className="panel">
      <h2>ページが見つかりません</h2>
      <p>
        <Link to="/">ホームに戻る</Link>
      </p>
    </div>
  )
}

function CatchBoundary({ error }: { error: Error }) {
  return (
    <div className="panel error">
      <h2>エラーが発生しました</h2>
      <pre>{error.message}</pre>
    </div>
  )
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: CatchBoundary,
    defaultNotFoundComponent: NotFound,
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
