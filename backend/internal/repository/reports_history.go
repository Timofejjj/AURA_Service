package repository

import (
	"aura/internal/models"
	"aura/pkg/logger"
	"context"
	"errors"

	sq "github.com/Masterminds/squirrel"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

type ReportsHistoryRepo struct {
	db *pgxpool.Pool
}

func NewReportsHistoryRepo(db *pgxpool.Pool) *ReportsHistoryRepo {
	return &ReportsHistoryRepo{db: db}
}

func (r *ReportsHistoryRepo) CreateReport(ctx context.Context, rh *models.CreateReportReq) error {
	// Парсим даты из строк формата YYYY-MM-DD
	var dateFrom, dateTo interface{}
	
	if rh.DateFrom != "" {
		dateFrom = rh.DateFrom
	} else {
		dateFrom = nil
	}
	
	if rh.DateTo != "" {
		dateTo = rh.DateTo
	} else {
		dateTo = nil
	}

	// Создаем запрос на отчет со статусом pending (report = NULL, потом вставится текст)
	cols := []string{"user_id", "date_from", "date_to", "status", "requested_at"}
	vals := []interface{}{rh.UserID, dateFrom, dateTo, "pending", sq.Expr("CURRENT_TIMESTAMP")}
	if rh.MethodologyType != nil && *rh.MethodologyType != "" {
		cols = append(cols, "methodology_type")
		vals = append(vals, *rh.MethodologyType)
	}
	sql, args, _ := QB.Insert("reports_history").
		Columns(cols...).
		Values(vals...).
		Suffix("RETURNING report_id").ToSql()
	err := r.db.QueryRow(ctx, sql, args...).Scan(&rh.ID)
	return err
}

// UpdateReportContent обновляет текст отчёта и помечает его готовым (после генерации). methodologyType опционален.
func (r *ReportsHistoryRepo) UpdateReportContent(ctx context.Context, reportID, userID int64, reportContent string, methodologyType *string) error {
	q := QB.Update("reports_history").
		Set("report", reportContent).
		Set("log_datetime", sq.Expr("CURRENT_TIMESTAMP")).
		Set("status", "completed").
		Where(sq.Eq{"report_id": reportID, "user_id": userID})
	if methodologyType != nil && *methodologyType != "" {
		q = q.Set("methodology_type", *methodologyType)
	}
	sql, args, err := q.ToSql()
	if err != nil {
		return err
	}
	result, err := r.db.Exec(ctx, sql, args...)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNoRows
	}
	return nil
}

// ErrNoRows — запись не найдена (например, при обновлении отчёта).
var ErrNoRows = errors.New("no rows affected")

// CheckWeeklyLimit проверяет, не превышен ли лимит запросов (2 в неделю)
func (r *ReportsHistoryRepo) CheckWeeklyLimit(ctx context.Context, userID int64) (bool, int, error) {
	sql, args, err := QB.Select("COUNT(*)").
		From("reports_history").
		Where(sq.And{
			sq.Eq{"user_id": userID},
			sq.GtOrEq{"requested_at": sq.Expr("NOW() - INTERVAL '7 days'")},
		}).
		ToSql()

	if err != nil {
		return false, 0, err
	}

	var count int
	err = r.db.QueryRow(ctx, sql, args...).Scan(&count)
	if err != nil {
		return false, 0, err
	}

	// Если count >= 2, лимит превышен
	return count >= 2, count, nil
}

func (r *ReportsHistoryRepo) GetReportByID(ctx context.Context, report_id, user_id int64) (*models.Report, error) {
	sql, args, err := QB.Select("report_id", "user_id", "log_datetime", "report", "date_from", "date_to", "status", "requested_at", "methodology_type").
		From("reports_history").
		Where(sq.Eq{"report_id": report_id, "user_id": user_id}).
		ToSql()

	if err != nil {
		return nil, err
	}

	var report models.Report
	err = r.db.QueryRow(ctx, sql, args...).Scan(
		&report.ID,
		&report.UserID,
		&report.LogDatetime,
		&report.Report,
		&report.DateFrom,
		&report.DateTo,
		&report.Status,
		&report.RequestedAt,
		&report.MethodologyType,
	)
	return &report, err
}

func (r *ReportsHistoryRepo) GetReports(ctx context.Context, req *models.GetReportsReq) ([]*models.Report, error) {
	q := QB.Select("report_id", "user_id", "log_datetime", "report", "date_from", "date_to", "status", "requested_at", "methodology_type").
		From("reports_history").
		Where(sq.Eq{"user_id": req.UserID})

	// date filters apply to "date_range_start" = COALESCE(date_from, log_datetime)::date
	if req.Date != "" {
		q = q.Where(sq.Expr("COALESCE(date_from, log_datetime)::date = ?::date", req.Date))
	}
	if req.From != "" {
		q = q.Where(sq.Expr("COALESCE(date_from, log_datetime)::date >= ?::date", req.From))
	}
	if req.To != "" {
		q = q.Where(sq.Expr("COALESCE(date_from, log_datetime)::date <= ?::date", req.To))
	}
	if req.Month != "" {
		q = q.Where(sq.Expr("to_char(COALESCE(date_from, log_datetime), 'YYYY-MM') = ?", req.Month))
	}

	sql, args, err := q.
		OrderBy("requested_at DESC").
		Limit(uint64(req.Limit)).
		Offset(uint64(req.Offset)).
		ToSql()

	if err != nil {
		logger.Warn(zap.Error(err))
		return nil, err
	}

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		logger.Warn(zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	var reports []*models.Report
	for rows.Next() {
		var report models.Report
		if err := rows.Scan(
			&report.ID,
			&report.UserID,
			&report.LogDatetime,
			&report.Report,
			&report.DateFrom,
			&report.DateTo,
			&report.Status,
			&report.RequestedAt,
			&report.MethodologyType,
		); err != nil {
			logger.Warn(zap.Error(err))
			return nil, err
		}
		reports = append(reports, &report)
	}
	
	// Убеждаемся, что возвращаем пустой массив вместо nil
	if reports == nil {
		reports = []*models.Report{}
	}
	
	return reports, rows.Err()
}

func (r *ReportsHistoryRepo) DeleteReport(ctx context.Context, report_id, user_id int64) error {
	sql, args, err := QB.Delete("reports_history").
		Where(sq.Eq{"report_id": report_id, "user_id": user_id}).
		ToSql()

	if err != nil {
		return err
	}

	_, err = r.db.Exec(ctx, sql, args...)
	return err
}
