package config

import (
	"github.com/caarlos0/env/v11"
)

type Config struct {
	DB     DB     `envPrefix:"DB_"`
	MQ     MQ     `envPrefix:"MQ_"`
	JWT    JWT    `envPrefix:"JWT_"`
	Anydoc Anydoc `envPrefix:"ANYDOC_"`
	API    API    `envPrefix:"API_"`
	RAG    Rag    `envPrefix:"RAG_"`
	OSS    OSS    `envPrefix:"OSS_"`
}

type OSS struct {
	Minio Minio `envPrefix:"MINIO_"`
}

type Minio struct {
	Endpoint    string   `env:"ENDPOINT" envDefault:"koala-qa-oss:9000"`
	AccessKey   string   `env:"ACCESS_KEY" envDefault:"koala"`
	SecretKey   string   `env:"SECRET_KEY"`
	Buckets     []string `env:"BUCKETS" envDefault:"koala"` // first one is default bucket
	MaxFileSize int      `env:"MAX_FILE_SIZE" envDefault:"104857600"`
}

type Rag struct {
	BaseURL string `env:"BASE_URL" envDefault:"http://koala-qa-raglite:8080/api/v1"`
	APIKey  string `env:"API_KEY" envDefault:"koala"`
	DEBUG   bool   `env:"DEBUG" envDefault:"false"`
}

type DB struct {
	DSN             string `env:"DSN"`
	Debug           bool   `env:"DEBUG" envDefault:"false"`
	MaxIdleConns    int    `env:"MAX_IDLE_CONNS" envDefault:"100"`
	MaxOpenConns    int    `env:"MAX_OPEN_CONNS" envDefault:"100"`
	ConnMaxLifetime int    `env:"CONN_MAX_LIFETIME" envDefault:"60"`
	ConnMaxIdleTime int    `env:"CONN_MAX_IDLE_TIME" envDefault:"0"`
}

type MQ struct {
	NATS NATS `envPrefix:"NATS_"`
}

type NATS struct {
	URL       string            `env:"URL" envDefault:"nats://koala-qa-mq:4222"`
	User      string            `env:"USER" envDefault:"koala"`
	Password  string            `env:"PASSWORD"`
	MsgMaxAge uint              `env:"MSG_MAX_AGE" envDefault:"604800"`
	Streams   map[string]string `env:"STREAMS"`
}

type JWT struct {
	Expire int64  `env:"EXPIRE" envDefault:"604800"`
	Secret string `env:"SECRET"`
}

type Anydoc struct {
	Address string `env:"ADDRESS" envDefault:"http://koala-qa-anydoc:8080"`
}

type API struct {
	Listen        string `env:"LISTEN" envDefault:":8080"`
	DEV           bool   `env:"DEV"`
	FreeAuth      bool   `env:"FREE_AUTH"`
	FreeCSRF      bool   `env:"FREE_CSRF"`
	AdminPassword string `env:"ADMIN_PASSWORD"`
	AdminEmail    string `env:"ADMIN_EMAIL"`
}

func newConfig() (Config, error) {
	var cfg Config

	err := env.Parse(&cfg)
	return cfg, err
}
