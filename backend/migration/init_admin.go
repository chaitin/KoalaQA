package migration

import (
	"errors"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/google/uuid"
)

type initAdmin struct {
	email    string
	password string
}

func (m *initAdmin) Version() int64 {
	return 20250903110910
}

func (m *initAdmin) Migrate(tx *gorm.DB) error {
	hashPass, err := bcrypt.GenerateFromPassword([]byte(m.password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	var admin model.User
	err = tx.Model(&model.User{}).Where("role = ? AND builtin = ?", model.UserRoleAdmin, true).First(&admin).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return tx.Create(&model.User{
				Name:      "admin",
				Email:     m.email,
				Avatar:    "",
				Builtin:   true,
				Password:  string(hashPass),
				Role:      model.UserRoleAdmin,
				Invisible: false,
				Key:       uuid.NewString(),
			}).Error
		}
		return err
	}

	updateM := map[string]any{
		"updated_at": time.Now(),
	}

	if m.email != admin.Email {
		updateM["email"] = m.email
	}

	err = bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(m.password))
	if err != nil {
		updateM["password"] = string(hashPass)
	}

	if len(updateM) == 1 {
		return nil
	}

	return tx.Model(&model.User{}).Where("id = ?", admin.ID).Updates(updateM).Error
}

func newInitAdmin(cfg config.Config) (migrator.Migrator, error) {
	if cfg.API.AdminPassword == "" {
		return nil, errors.New("empty env API_ADMIN_PASSWORD")
	}
	if cfg.API.AdminEmail == "" {
		return nil, errors.New("empty env API_ADMIN_EMAIL")
	}
	return &initAdmin{email: cfg.API.AdminEmail, password: cfg.API.AdminPassword}, nil
}
