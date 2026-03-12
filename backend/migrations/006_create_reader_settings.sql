-- Reader settings per user
CREATE TABLE IF NOT EXISTS reader_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  theme VARCHAR(10) NOT NULL DEFAULT 'light',            -- light | sepia | dark
  font_family VARCHAR(20) NOT NULL DEFAULT 'SF',         -- Georgia | SF | Iowan | Avenir
  font_size INTEGER NOT NULL DEFAULT 16,                 -- px
  font_weight INTEGER NOT NULL DEFAULT 400,              -- 100..900
  ligatures BOOLEAN NOT NULL DEFAULT TRUE,
  line_height NUMERIC NOT NULL DEFAULT 1.45,             -- 1.0..1.8
  text_align VARCHAR(10) NOT NULL DEFAULT 'left',        -- left | justify
  brightness NUMERIC NOT NULL DEFAULT 1.0,               -- 0.5..1.2
  transitions BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reader_settings_updated_at ON reader_settings(updated_at);

