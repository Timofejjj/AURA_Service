package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	DBSource         string `mapstructure:"CONN_STRING"`
	ServerName       string `mapstructure:"SERVER_NAME"`
	Port             string `mapstructure:"PORT"`
	Level            string `json:"level" mapstructure:"LOG_LEVEL"`
	Format           string `json:"format" mapstructure:"LOG_FORMAT"`
	Output           string `json:"output" mapstructure:"LOG_OUTPUT"`
	FilePath         string `json:"file_path" mapstructure:"LOG_FILE_PATH"`
	WithCaller       bool   `json:"with_caller" mapstructure:"LOG_WITH_CALLER"`
	PrivateKeyPath   string `mapstructure:"JWT_PRIVATE_KEY_PATH"`
	PublicKeyPath    string `mapstructure:"JWT_PUBLIC_KEY_PATH"`
	AccessTTLMinutes int    `mapstructure:"JWT_ACCESS_TTL_MINUTES" default:"15"`
	RefreshTTLDays   int    `mapstructure:"JWT_REFRESH_TTL_DAYS" default:"7"`
	MlEndpoint       string `mapstructure:"ENDPOINT"`
}

func LoadConfig(path string) (config Config, err error) {
	viper.AddConfigPath(path)
	viper.SetConfigName("app")
	viper.SetConfigType("env")
	viper.AutomaticEnv()
	err = viper.ReadInConfig()
	if err != nil {
		return
	}
	err = viper.Unmarshal(&config)
	return
}
