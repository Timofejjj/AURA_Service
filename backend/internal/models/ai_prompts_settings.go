package models

type AIPromptsSettings struct {
	UserID         int64   `json:"user_id"`
	WordsForPrompt *string `json:"words_for_prompt"`
}

type GetAiSettingsReq struct {
	UserId int64 `json:"user_id"`
}

type UpsertAIPromptsSettingsReq struct {
	UserId         int64  `json:"user_id"`
	WordsForPrompt string `json:"words_for_prompt" binding:"required,min=10,max=5000"`
}
