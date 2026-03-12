-- Роли: user (по умолчанию), admin (без лимита на заявки отчётов).
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

UPDATE users SET role = 'admin' WHERE LOWER(username) = 'tima';

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

COMMENT ON COLUMN users.role IS 'user - обычный (3 заявки/неделю), admin - без лимита';
