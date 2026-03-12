CREATE TABLE refresh_sessions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    refresh_token   TEXT NOT NULL UNIQUE,
    user_agent      TEXT,
    fingerprint     TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_sessions_token ON refresh_sessions(refresh_token);

CREATE INDEX idx_refresh_sessions_user_id ON refresh_sessions(user_id);

COMMENT ON TABLE "refresh_sessions" IS 'Сессии пользователя';