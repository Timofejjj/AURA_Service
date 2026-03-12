package models

import "time"

type Thought struct {
	ThoughtID      int64      `json:"thought_id" db:"thought_id"`
	UserID         int64      `json:"user_id" db:"user_id"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	SubmittedAt    *time.Time `json:"submitted_at,omitempty" db:"submitted_at"`
	Content        *string    `json:"content,omitempty" db:"content"`
	VoiceText      *string    `json:"voice_text,omitempty" db:"voice_text"`
	VoiceID        *string    `json:"voice_id,omitempty" db:"voice_id"`
	SentimentLabel *string    `json:"sentiment_label,omitempty" db:"sentiment_label"`
	SentimentScore *float64   `json:"sentiment_score,omitempty" db:"sentiment_score"`
	ImageID        *string    `json:"image_id,omitempty" db:"image_id"`
	TypeThought    *string    `json:"type_thought,omitempty" db:"type_thought"`
}

type CreateThoughtReq struct {
	ThoughtID      int64     `json:"thought_id" db:"thought_id"`
	UserID         int64     `json:"user_id" db:"user_id"`
	CreatedAt      *time.Time `json:"created_at,omitempty" db:"created_at"` // если задано — запись привязывается к этой дате (для экрана дня)
	Content        *string   `json:"content,omitempty" db:"content"`
	VoiceText      *string   `json:"voice_text,omitempty" db:"voice_text"`
	VoiceID        *string   `json:"voice_id,omitempty" db:"voice_id"`
	SentimentLabel *string   `json:"sentiment_label,omitempty" db:"sentiment_label"`
	SentimentScore *float64  `json:"sentiment_score,omitempty" db:"sentiment_score"`
	ImageID        *string   `json:"image_id,omitempty" db:"image_id"`
	TypeThought    *string   `json:"type_thought,omitempty" db:"type_thought"`
}

type UpdateThoughtReq struct {
	ThoughtID      int64      `json:"thought_id" db:"thought_id"`
	Content        *string    `json:"content,omitempty" db:"content"`
	VoiceText      *string    `json:"voice_text,omitempty" db:"voice_text"`
	VoiceID        *string    `json:"voice_id,omitempty" db:"voice_id"`
	SubmittedAt    *time.Time `json:"submitted_at,omitempty" db:"submitted_at"`
	SentimentLabel *string    `json:"sentiment_label,omitempty" db:"sentiment_label"`
	SentimentScore *float64   `json:"sentiment_score,omitempty" db:"sentiment_score"`
	ImageID        *string    `json:"image_id,omitempty" db:"image_id"`
	TypeThought    *string    `json:"type_thought,omitempty" db:"type_thought"`
}
