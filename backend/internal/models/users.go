package models

import "time"

type User struct {
	UserID       int64     `json:"user_id" db:"user_id"`
	Username     string    `json:"username" db:"username"`
	Email        string    `json:"email" db:"email"`
	Password     string    `json:"-" db:"password"`
	GoogleSub    *string   `json:"-" db:"google_sub"`
	AuthProvider string    `json:"auth_provider" db:"auth_provider"`
	AvatarURL    *string   `json:"avatar_url" db:"avatar_url"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

type CreateUserReq struct {
	Username string `json:"username" binding:"required,min=3,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type CreateGoogleUserReq struct {
	Username     string  `json:"username"`
	Email        string  `json:"email"`
	GoogleSub    string  `json:"google_sub"`
	AuthProvider string  `json:"auth_provider"`
	AvatarURL    *string `json:"avatar_url"`
}

type GetUserReq struct {
	Email string `json:"email" binding:"required,email"`
}
