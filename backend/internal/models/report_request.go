package models

// CreateReportRequestReq — заявка на отчёт (только диапазон дат).
type CreateReportRequestReq struct {
	UserID   int64  `json:"-"`
	DateFrom string `json:"date_from"` // YYYY-MM-DD
	DateTo   string `json:"date_to"`   // YYYY-MM-DD
}

// ReportRequestLimitError — превышен лимит заявок (3 в неделю).
type ReportRequestLimitError struct {
	Count int
}

func (e *ReportRequestLimitError) Error() string {
	return "weekly report request limit exceeded"
}
