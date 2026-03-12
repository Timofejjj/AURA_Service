package models

import (
	"encoding/json"
	"time"
)

// DateOnly — дата в формате YYYY-MM-DD для запросов с фронта
type DateOnly struct {
	Time time.Time
}

func (d *DateOnly) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	if s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return err
	}
	d.Time = t
	return nil
}

func (d DateOnly) MarshalJSON() ([]byte, error) {
	if d.Time.IsZero() {
		return []byte("null"), nil
	}
	return json.Marshal(d.Time.Format("2006-01-02"))
}

// MethodologyType — тип методики отчёта: SOAP, DAP, BASIC ID, PIE
const (
	MethodologySOAP     = "SOAP"
	MethodologyDAP      = "DAP"
	MethodologyBasicID  = "BASIC ID"
	MethodologyPIE      = "PIE"
)

type Report struct {
	ID              int64      `json:"report_id" db:"report_id"`
	UserID          int64      `json:"user_id" db:"user_id"`
	LogDatetime     *time.Time `json:"created_at,omitempty" db:"log_datetime"` // Nullable - может быть NULL для pending
	Report          *string    `json:"report,omitempty" db:"report"`           // Nullable - NULL пока отчет не готов
	DateFrom        *time.Time `json:"date_from,omitempty" db:"date_from"`
	DateTo          *time.Time `json:"date_to,omitempty" db:"date_to"`
	Status          string     `json:"status" db:"status"`                     // pending, completed, failed
	RequestedAt     time.Time  `json:"requested_at" db:"requested_at"`        // Когда пользователь запросил
	MethodologyType *string    `json:"methodology_type,omitempty" db:"methodology_type"` // SOAP, DAP, BASIC ID, PIE
}

type CreateReportReq struct {
	ID              int64   `json:"-"` // Не принимаем из JSON, генерируем в БД
	UserID          int64   `json:"-"` // Берем из JWT токена
	DateFrom        string  `json:"date_from"`        // Строка в формате YYYY-MM-DD
	DateTo          string  `json:"date_to"`          // Строка в формате YYYY-MM-DD
	MethodologyType *string `json:"methodology_type"` // SOAP, DAP, BASIC ID, PIE — опционально
}

type GetReportReq struct {
	ID     int64 `json:"id"`
	UserID int64 `json:"user_id"`
}

type GetReportsReq struct {
	UserID int64 `json:"user_id"`
	Limit  int64 `json:"limit"`
	Offset int64 `json:"offset"`
	// Filters (all optional). Dates are YYYY-MM-DD, month is YYYY-MM.
	Date  string `json:"date"`
	From  string `json:"from"`
	To    string `json:"to"`
	Month string `json:"month"`
}

// UpdateReportReq — тело запроса на обновление текста отчёта (после генерации)
type UpdateReportReq struct {
	Report          string  `json:"report"`
	MethodologyType *string `json:"methodology_type"` // SOAP, DAP, BASIC ID, PIE — опционально
}

// WeeklyLimitError - ошибка превышения лимита запросов
type WeeklyLimitError struct {
	Count int
}

func (e *WeeklyLimitError) Error() string {
	return "weekly report limit exceeded"
}
