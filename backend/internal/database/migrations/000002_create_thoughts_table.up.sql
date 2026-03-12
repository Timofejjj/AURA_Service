CREATE TABLE "thoughts" (
  "thought_id" BIGSERIAL PRIMARY KEY,
  "user_id" integer NOT NULL,
  "created_at" timestamp,
  "content" text,
  "voice_text" text,
  "sentiment_label" varchar,
  "sentiment_score" decimal(3,2),
  "minio_id" text,
  "type_thought" varchar,
  "mind_score" float
);

CREATE INDEX "idx_thoughts_id" ON "thoughts" ("thought_id");

CREATE INDEX "idx_thoughts_user_id" ON "thoughts" ("user_id");

CREATE INDEX "idx_thoughts_created_at" ON "thoughts" ("created_at");

CREATE INDEX "idx_thoughts_sentiment" ON "thoughts" ("sentiment_label");

CREATE INDEX "idx_thoughts_type" ON "thoughts" ("type_thought");

CREATE INDEX "idx_thoughts_user_created" ON "thoughts" ("user_id", "created_at");

CREATE INDEX "idx_thoughts_user_type" ON "thoughts" ("user_id", "type_thought");

COMMENT ON TABLE "thoughts" IS 'Таблица записей дневника/мыслей';