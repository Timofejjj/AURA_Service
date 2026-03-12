CREATE TABLE "ai_prompts_settings" (
  "user_id" integer PRIMARY KEY REFERENCES users(user_id),
  "words_for_prompt" text
);

COMMENT ON TABLE "ai_prompts_settings" IS 'Настройка персональности отчета для каждого пользователя';