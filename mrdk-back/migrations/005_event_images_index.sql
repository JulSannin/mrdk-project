-- Индекс под внешний ключ event_images.event_id. Postgres, в отличие от MySQL,
-- индекс для FK сам не создаёт, а в 001_init.sql его забыли — у event_videos
-- аналогичный индекс есть с миграции 002.
-- Без него seq scan по всей таблице картинок идёт на каждом открытии страницы
-- события (getEvent) и при каскадном удалении события.
CREATE INDEX IF NOT EXISTS idx_event_images_event_id ON event_images(event_id);
