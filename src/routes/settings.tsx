import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

// ssr: false —— この route は beforeLoad / loader / 描画のすべてが
// クライアントでのみ実行される。localStorage のようなブラウザ専用 API を
// 初期レンダリングから安全に使える。

type Theme = 'light' | 'dark'

const readTheme = (): Theme =>
  localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'

const applyTheme = (theme: Theme) => {
  localStorage.setItem('theme', theme)
  document.documentElement.dataset.theme = theme
}

export const Route = createFileRoute('/settings')({
  ssr: false,
  component: Settings,
})

function Settings() {
  // ssr: false なのでサーバーでは実行されず、localStorage に直接触れられる
  const [theme, setTheme] = useState<Theme>(readTheme)

  const handleChange = (next: Theme) => {
    setTheme(next)
    applyTheme(next)
  }

  return (
    <div className="panel">
      <h1>設定</h1>
      <p>
        このルートは <code>ssr: false</code>。サーバーは HTML を一切
        レンダリングせず、すべてクライアントで描画される。
      </p>
      <fieldset className="theme-picker">
        <legend>テーマ</legend>
        <label>
          <input
            type="radio"
            name="theme"
            checked={theme === 'light'}
            onChange={() => handleChange('light')}
          />
          ライト
        </label>
        <label>
          <input
            type="radio"
            name="theme"
            checked={theme === 'dark'}
            onChange={() => handleChange('dark')}
          />
          ダーク
        </label>
      </fieldset>
    </div>
  )
}
