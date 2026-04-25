-- ═══════════════════════════════════════════════════════════
--  Allen Dashboard — Supabase Schema
--  在 Supabase 專案的 SQL Editor 貼上並執行此檔案
-- ═══════════════════════════════════════════════════════════

-- 行事曆事件
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id         TEXT        PRIMARY KEY,
  title      TEXT        NOT NULL,
  date       TEXT        NOT NULL,
  time       TEXT        NOT NULL DEFAULT '',
  note       TEXT        NOT NULL DEFAULT '',
  color      TEXT        NOT NULL DEFAULT '#58a6ff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 儀表板設定（key-value）
--  key 值：word_idx | links | keywords | feeds | podcasts | word_notes
CREATE TABLE IF NOT EXISTS public.dashboard_config (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL DEFAULT 'null',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 艾倫歷史上的今天（個人記事）
CREATE TABLE IF NOT EXISTS public.personal_history (
  id          TEXT        PRIMARY KEY,
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  year        INTEGER     NOT NULL,
  month       INTEGER     NOT NULL,   -- 1-12
  day         INTEGER     NOT NULL,   -- 1-31
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────
-- 個人使用：停用 RLS，anon key 即可讀寫
-- 若部署到公開網路，請啟用 auth 並加入 RLS policy
ALTER TABLE public.calendar_events  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_history DISABLE ROW LEVEL SECURITY;

-- ── Index ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cal_date    ON public.calendar_events  (date);
CREATE INDEX IF NOT EXISTS idx_ph_month_day ON public.personal_history (month, day);
