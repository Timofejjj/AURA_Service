-- Очистка таблицы thoughts для всех пользователей
-- ВНИМАНИЕ: Это удалит ВСЕ мысли!

DELETE FROM thoughts;

-- Сброс счетчика автоинкремента (если используется)
-- ALTER SEQUENCE thoughts_thought_id_seq RESTART WITH 1;

