// cloudflare:workers は workerd(Cloudflare Workers ランタイム)組み込みの
// モジュールで、リクエストコンテキスト外からバインディング(env)に
// アクセスできる。型はローカルの tsc 用に最小限だけ宣言する。
// 実体は Workers 上にしか存在せず、node では import 自体が失敗する
// (db.ts はそれを検知して FS ストアへフォールバックする)。

declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>
}
