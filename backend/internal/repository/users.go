package repository

import (
	"aura/internal/models"
	"context"
	"database/sql"
	"errors"

	sq "github.com/Masterminds/squirrel"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UsersRepo struct {
	db *pgxpool.Pool
}

func NewUsersRepo(db *pgxpool.Pool) *UsersRepo {
	return &UsersRepo{db: db}
}

func (r *UsersRepo) CreateUser(ctx context.Context, req *models.CreateUserReq) (*models.User, error) {
	sqlQuery, args, err := QB.Insert("users").
		Columns("username", "email", "password", "auth_provider").
		Values(req.Username, req.Email, req.Password, "local").
		Suffix("RETURNING user_id, username, email, password, COALESCE(auth_provider, 'local'), created_at").
		ToSql()
	if err != nil {
		return nil, err
	}
	var user models.User
	err = r.db.QueryRow(ctx, sqlQuery, args...).Scan(&user.UserID, &user.Username, &user.Email, &user.Password, &user.AuthProvider, &user.CreatedAt)
	return &user, err
}

func (r *UsersRepo) CreateGoogleUser(ctx context.Context, req *models.CreateGoogleUserReq) (*models.User, error) {
	sqlQuery, args, err := QB.Insert("users").
		Columns("username", "email", "google_sub", "auth_provider", "avatar_url").
		Values(req.Username, req.Email, req.GoogleSub, "google", req.AvatarURL).
		Suffix("RETURNING user_id, username, email, COALESCE(auth_provider, 'google'), created_at").
		ToSql()
	if err != nil {
		return nil, err
	}
	var user models.User
	err = r.db.QueryRow(ctx, sqlQuery, args...).Scan(&user.UserID, &user.Username, &user.Email, &user.AuthProvider, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	user.GoogleSub = &req.GoogleSub
	user.AvatarURL = req.AvatarURL
	return &user, nil
}

func (r *UsersRepo) GetByEmail(ctx context.Context, req *models.GetUserReq) (*models.User, error) {
	sqlQuery, args, err := QB.Select("user_id", "username", "email", "COALESCE(password, '')", "google_sub", "COALESCE(auth_provider, 'local')", "avatar_url", "created_at").
		From("users").
		Where(sq.Eq{"email": req.Email}).
		ToSql()
	if err != nil {
		return nil, err
	}

	var user models.User
	var googleSub sql.NullString
	var avatarURL sql.NullString
	err = r.db.QueryRow(ctx, sqlQuery, args...).Scan(&user.UserID, &user.Username, &user.Email, &user.Password, &googleSub, &user.AuthProvider, &avatarURL, &user.CreatedAt)
	if err != nil {
		return nil, err
	}

	if googleSub.Valid {
		user.GoogleSub = &googleSub.String
	}
	if avatarURL.Valid {
		user.AvatarURL = &avatarURL.String
	}

	return &user, nil
}

func (r *UsersRepo) GetByGoogleSub(ctx context.Context, googleSub string) (*models.User, error) {
	sqlQuery, args, err := QB.Select("user_id", "username", "email", "COALESCE(password, '')", "google_sub", "COALESCE(auth_provider, 'google')", "avatar_url", "created_at").
		From("users").
		Where(sq.Eq{"google_sub": googleSub}).
		ToSql()
	if err != nil {
		return nil, err
	}

	var user models.User
	var gSub sql.NullString
	var avatarURL sql.NullString
	err = r.db.QueryRow(ctx, sqlQuery, args...).Scan(&user.UserID, &user.Username, &user.Email, &user.Password, &gSub, &user.AuthProvider, &avatarURL, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // User not found, not an error
		}
		return nil, err
	}

	if gSub.Valid {
		user.GoogleSub = &gSub.String
	}
	if avatarURL.Valid {
		user.AvatarURL = &avatarURL.String
	}

	return &user, nil
}

func (r *UsersRepo) UpdateGoogleSub(ctx context.Context, userID int64, googleSub string, avatarURL *string) error {
	builder := QB.Update("users").
		Set("google_sub", googleSub).
		Set("auth_provider", "google").
		Where(sq.Eq{"user_id": userID})

	if avatarURL != nil {
		builder = builder.Set("avatar_url", *avatarURL)
	}

	sqlQuery, args, err := builder.ToSql()
	if err != nil {
		return err
	}

	_, err = r.db.Exec(ctx, sqlQuery, args...)
	return err
}

// GetRoleByUserID возвращает роль пользователя (user, admin) или пустую строку при ошибке.
func (r *UsersRepo) GetRoleByUserID(ctx context.Context, userID int64) (string, error) {
	var role string
	err := r.db.QueryRow(ctx, `SELECT COALESCE(role, 'user') FROM users WHERE user_id = $1`, userID).Scan(&role)
	if err != nil {
		return "", err
	}
	return role, nil
}
