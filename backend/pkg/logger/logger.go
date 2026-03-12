package logger

import (
	"aura/internal/config"
	"os"
	"runtime"
	"strings"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type Logger struct {
	*zap.SugaredLogger
	zap *zap.Logger
}

var globalLogger *Logger

func New(cfg config.Config) *Logger {
	var level zapcore.Level
	switch strings.ToLower(cfg.Level) {
	case "debug":
		level = zapcore.DebugLevel
	case "info":
		level = zapcore.InfoLevel
	case "warn", "warning":
		level = zapcore.WarnLevel
	case "error":
		level = zapcore.ErrorLevel
	default:
		level = zapcore.InfoLevel
	}

	var encoder zapcore.Encoder
	encoderConfig := zap.NewDevelopmentEncoderConfig()

	if cfg.Format == "json" {
		encoderConfig = zap.NewProductionEncoderConfig()
		encoderConfig.TimeKey = "timestamp"
		encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		encoder = zapcore.NewJSONEncoder(encoderConfig)
	} else {
		encoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		encoderConfig.EncodeCaller = zapcore.ShortCallerEncoder
		encoder = zapcore.NewConsoleEncoder(encoderConfig)
	}

	var writeSyncer zapcore.WriteSyncer
	if cfg.Output == "file" && cfg.FilePath != "" {
		file, err := os.OpenFile(cfg.FilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err != nil {
			writeSyncer = zapcore.AddSync(os.Stdout)
		} else {
			writeSyncer = zapcore.AddSync(file)
		}
	} else {
		writeSyncer = zapcore.AddSync(os.Stdout)
	}

	core := zapcore.NewCore(
		encoder,
		writeSyncer,
		level,
	)

	opts := []zap.Option{
		zap.AddStacktrace(zapcore.ErrorLevel),
	}

	if cfg.WithCaller {
		opts = append(opts, zap.AddCaller())
	}

	zapLogger := zap.New(core, opts...)
	sugared := zapLogger.Sugar()

	return &Logger{
		SugaredLogger: sugared,
		zap:           zapLogger,
	}
}

func Init(cfg config.Config) {
	globalLogger = New(cfg)
	zap.ReplaceGlobals(globalLogger.zap)
}

func Global() *Logger {
	if globalLogger == nil {
		globalLogger = New(config.Config{
			Level:  "info",
			Format: "console",
			Output: "stdout",
		})
		zap.ReplaceGlobals(globalLogger.zap)
	}
	return globalLogger
}

func Sync() error {
	if globalLogger != nil {
		return globalLogger.zap.Sync()
	}
	return nil
}

func (l *Logger) With(args ...interface{}) *Logger {
	return &Logger{
		SugaredLogger: l.SugaredLogger.With(args...),
		zap:           l.zap,
	}
}

func (l *Logger) WithFields(fields map[string]interface{}) *Logger {
	args := make([]interface{}, 0, len(fields)*2)
	for k, v := range fields {
		args = append(args, k, v)
	}
	return l.With(args...)
}

func (l *Logger) WithError(err error) *Logger {
	return l.With("error", err)
}

func (l *Logger) WithCaller() *Logger {
	if pc, file, line, ok := runtime.Caller(1); ok {
		funcName := runtime.FuncForPC(pc).Name()
		path := strings.Split(file, "/")
		if len(path) > 2 {
			path = path[len(path)-2:]
		}
		filename := strings.Join(path, "/")

		return l.With(
			"caller", filename+":"+string(rune(line)),
			"func", funcName,
		)
	}
	return l.With("caller", "unknown")
}

func Debug(args ...interface{}) {
	Global().Debug(args...)
}

func Debugf(template string, args ...interface{}) {
	Global().Debugf(template, args...)
}

func Debugw(msg string, keysAndValues ...interface{}) {
	Global().Debugw(msg, keysAndValues...)
}

func Info(args ...interface{}) {
	Global().Info(args...)
}

func Infof(template string, args ...interface{}) {
	Global().Infof(template, args...)
}

func Infow(msg string, keysAndValues ...interface{}) {
	Global().Infow(msg, keysAndValues...)
}

func Warn(args ...interface{}) {
	Global().Warn(args...)
}

func Warnf(template string, args ...interface{}) {
	Global().Warnf(template, args...)
}

func Warnw(msg string, keysAndValues ...interface{}) {
	Global().Warnw(msg, keysAndValues...)
}

func Error(args ...interface{}) {
	Global().Error(args...)
}

func Errorf(template string, args ...interface{}) {
	Global().Errorf(template, args...)
}

func Errorw(msg string, keysAndValues ...interface{}) {
	Global().Errorw(msg, keysAndValues...)
}

func Fatal(args ...interface{}) {
	Global().Fatal(args...)
}

func Fatalf(template string, args ...interface{}) {
	Global().Fatalf(template, args...)
}

func Fatalw(msg string, keysAndValues ...interface{}) {
	Global().Fatalw(msg, keysAndValues...)
}

func With(keysAndValues ...interface{}) *Logger {
	return Global().With(keysAndValues...)
}

func WithError(err error) *Logger {
	return Global().WithError(err)
}

func WithFields(fields map[string]interface{}) *Logger {
	return Global().WithFields(fields)
}

func DebugWithCaller(msg string, keysAndValues ...interface{}) {
	Global().WithCaller().Debugw(msg, keysAndValues...)
}

func InfoWithCaller(msg string, keysAndValues ...interface{}) {
	Global().WithCaller().Infow(msg, keysAndValues...)
}

func WarnWithCaller(msg string, keysAndValues ...interface{}) {
	Global().WithCaller().Warnw(msg, keysAndValues...)
}

func ErrorWithCaller(msg string, keysAndValues ...interface{}) {
	Global().WithCaller().Errorw(msg, keysAndValues...)
}
