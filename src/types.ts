// クライアント・サーバー双方から参照できる共有型。
// 実装(データアクセス)は src/server/ 配下のサーバー専用境界にある。

export interface Todo {
  id: string
  title: string
  note: string
  done: boolean
  createdAt: string
}

export type TodoFilter = 'all' | 'active' | 'completed'
export type TodoSort = 'created' | 'title'

export interface TodoStats {
  total: number
  active: number
  completed: number
  completionRate: number
}
