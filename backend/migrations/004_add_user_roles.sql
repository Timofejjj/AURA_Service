-- Роли: user (по умолчанию), admin (без лимита на заявки отчётов).
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

UPDATE users SET role = 'admin' WHERE LOWER(username) = 'tima';

-- Если колонка только что добавлена и была NULL у существующих строк:
UPDATE users SET role = 'user' WHERE role IS NULL;

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
