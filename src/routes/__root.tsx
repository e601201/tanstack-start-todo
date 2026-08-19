/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import appCss from '~/styles/app.css?url'

// ルートルートはフルドキュメント SSR のシェル。<html> から <body> まで
// サーバーでレンダリングされ、head() の内容は HeadContent が挿入する。

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'TanStack Start Todo' },
      {
        name: 'description',
        content: 'TanStack Start による SSR + ストリーミング対応 Todo アプリ',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  shellComponent: RootDocument,
})

// 初回ペイント前にテーマを適用し、ダークテーマ時のフラッシュを防ぐ
const themeInitScript = `
try {
  var t = localStorage.getItem('theme')
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t
} catch (e) {}
`

function RootDocument({ children }: { children: ReactNode }) {
  return (
    // data-theme はハイドレーション前にインラインスクリプトが付与するため、
    // この要素の属性差分警告のみ抑止する(子要素には影響しない)
    <html lang="ja" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <header className="site-header">
          <nav>
            <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: 'active' }}>
              ホーム
            </Link>
            <Link to="/todos" activeProps={{ className: 'active' }}>
              Todo
            </Link>
            <Link to="/about" activeProps={{ className: 'active' }}>
              サーバー情報
            </Link>
            <Link to="/settings" activeProps={{ className: 'active' }}>
              設定
            </Link>
          </nav>
        </header>
        <main className="container">{children}</main>
        <Scripts />
      </body>
    </html>
  )
}
