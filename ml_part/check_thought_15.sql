-- Проверка мысли ID=15 в БД
SELECT thought_id, user_id, content, type_thought, sentiment_label, sentiment_score, created_at 
FROM thoughts 
WHERE thought_id = 15;

