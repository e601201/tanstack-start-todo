import { createFileRoute } from '@tanstack/react-router'
import { getServerInfo } from '~/server/functions'

// ssr: 'data-only' —— 初回リクエスト時、loader はサーバーで実行されて
// 結果がドキュメントに同梱されるが、この route の HTML はサーバーでは
// レンダリングされず、クライアントで描画される。SEO 不要かつ
// サーバーデータは欲しい、という画面向けの SSR モード。

export const Route = createFileRoute('/about')({
  ssr: 'data-only',
  loader: () => getServerInfo(),
  component: About,
})

function About() {
  const info = Route.useLoaderData()

  return (
    <div className="panel">
      <h1>サーバー情報</h1>
      <p>
        このルートは <code>ssr: 'data-only'</code>。以下のデータは loader が
        サーバー側で取得したものだが、HTML の描画自体はクライアントで行われる。
      </p>
      <dl className="kv">
        <dt>Node.js</dt>
        <dd>{info.nodeVersion}</dd>
        <dt>プラットフォーム</dt>
        <dd>{info.platform}</dd>
        <dt>プロセス ID</dt>
        <dd>{info.pid}</dd>
        <dt>稼働時間</dt>
        <dd>{info.uptimeSeconds} 秒</dd>
        <dt>取得時刻</dt>
        <dd>{info.renderedAt}</dd>
      </dl>
    </div>
  )
}
