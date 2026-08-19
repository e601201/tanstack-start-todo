-- todos テーブルと初期データ。
--
-- boolean は SQLite に無いので done は INTEGER (0/1)。日時は ISO 8601 の
-- TEXT で持ち、文字列ソートが時系列ソートと一致するようにしている。
-- シードの id は固定値 —— どこから読んでも同じ id になり、
-- /api/todos/:id の動作確認がしやすい。

CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

INSERT INTO todos (id, title, note, done, created_at) VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'TanStack Start のルートを眺める',
    'src/routes/ がファイルベースルーティングの入口。',
    1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'search params のバリデーションを試す',
    '/todos?filter=active&q=... を書き換えると Zod が検証する。',
    0,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 days')
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'D1 で永続化を確認する',
    'POST した Todo がリクエストを跨いで残れば D1 が効いている。',
    0,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  );
