-- Месяц плана работы (1–12), задаётся в админке. Нужен для сортировки внутри года:
-- декабрь → ноябрь → … → январь (новые сверху). Nullable: у старых записей месяца нет,
-- их можно проставить позже в админке.
ALTER TABLE workplan ADD COLUMN IF NOT EXISTS month SMALLINT;

-- Публичный порядок: год ↓, месяц ↓, затем дата создания ↓.
DROP INDEX IF EXISTS idx_workplan_year;
CREATE INDEX IF NOT EXISTS idx_workplan_year_month
  ON workplan(year DESC NULLS LAST, month DESC NULLS LAST, created_at DESC);
