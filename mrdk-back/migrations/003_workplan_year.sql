-- Год, к которому относится план работы (задаётся в админке; по нему группируется
-- публичная страница /workplan). Nullable: у уже существующих записей года нет,
-- их можно проставить позже в админке.
ALTER TABLE workplan ADD COLUMN IF NOT EXISTS year SMALLINT;

-- Публичный порядок: годы по убыванию, внутри года — новые сверху.
CREATE INDEX IF NOT EXISTS idx_workplan_year ON workplan(year DESC NULLS LAST, created_at DESC);
