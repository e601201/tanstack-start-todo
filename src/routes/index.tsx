import { Link, createFileRoute } from '@tanstack/react-router'

// ホームは静的な内容なので既定のフル SSR(ssr: true)のまま。

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="panel">
      <h1>TanStack Start Todo</h1>
      <p>
        ファイルベースルーティング・検証付き search params・route loader・
        型付きサーバー関数・フルドキュメント SSR・ストリーミングを備えた
        サンプルアプリです。
      </p>
      <ul>
        <li>
          <Link to="/todos" search={{ filter: 'all', sort: 'created', q: '' }}>
            Todo 一覧
          </Link>
          — loader + 検証付き search params + ストリーミング統計(フル SSR)
        </li>
        <li>
          <Link to="/about">サーバー情報</Link> — <code>ssr: 'data-only'</code>
          (loader はサーバー実行、HTML はクライアントレンダリング)
        </li>
        <li>
          <Link to="/settings">設定</Link> — <code>ssr: false</code>
          (完全クライアントレンダリング)
        </li>
      </ul>
    </div>
  )
}
