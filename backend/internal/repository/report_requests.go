package repository

import (
	"aura/internal/models"
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const dateLayout = "2006-01-02"

type ReportRequestsRepo struct {
	db *pgxpool.Pool
}

func NewReportRequestsRepo(db *pgxpool.Pool) *ReportRequestsRepo {
	return &ReportRequestsRepo{db: db}
}

func (r *ReportRequestsRepo) Create(ctx context.Context, req *models.CreateReportRequestReq) error {
	dateFrom, err := time.Parse(dateLayout, req.DateFrom)
	if err != nil {
		return err
	}
	dateTo, err := time.Parse(dateLayout, req.DateTo)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx,
		`INSERT INTO report_requests (user_id, date_from, date_to) VALUES ($1, $2, $3)`,
		req.UserID, dateFrom, dateTo)
	return err
}

// CheckWeeklyLimit возвращает (превышен ли лимит, количество заявок за последние 7 дней, ошибка).
// Лимит — 3 заявки в неделю.
func (r *ReportRequestsRepo) CheckWeeklyLimit(ctx context.Context, userID int64) (exceeded bool, count int, err error) {
	// Граница в Go, чтобы pgx мог закодировать параметр (sq.Expr ломал кодировку).
	since := time.Now().Add(-7 * 24 * time.Hour)
	err = r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM report_requests WHERE user_id = $1 AND requested_at >= $2`,
		userID, since).Scan(&count)
	if err != nil {
		return false, 0, err
	}
	return count >= 3, count, nil
}
