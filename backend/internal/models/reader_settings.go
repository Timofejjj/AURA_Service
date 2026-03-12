package models

import "time"

type ReaderSettings struct {
	UserID      int64     `json:"user_id" db:"user_id"`
	Theme       string    `json:"theme" db:"theme"`                 // light | sepia | dark
	FontFamily  string    `json:"font_family" db:"font_family"`     // Georgia | SF | Iowan | Avenir
	FontSize    int       `json:"font_size" db:"font_size"`         // 12..28
	FontWeight  int       `json:"font_weight" db:"font_weight"`     // 100..900
	Ligatures   bool      `json:"ligatures" db:"ligatures"`
	LineHeight  float64   `json:"line_height" db:"line_height"`     // 1.0..1.8
	TextAlign   string    `json:"text_align" db:"text_align"`       // left | justify
	Brightness  float64   `json:"brightness" db:"brightness"`       // 0.5..1.2
	Transitions bool      `json:"transitions" db:"transitions"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type UpsertReaderSettingsReq struct {
	Theme       string   `json:"theme"`
	FontFamily  string   `json:"font_family"`
	FontSize    int      `json:"font_size"`
	FontWeight  int      `json:"font_weight"`
	Ligatures   bool     `json:"ligatures"`
	LineHeight  float64  `json:"line_height"`
	TextAlign   string   `json:"text_align"`
	Brightness  float64  `json:"brightness"`
	Transitions bool     `json:"transitions"`
	UserID      int64    `json:"-"` // from JWT
}

