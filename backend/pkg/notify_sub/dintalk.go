package notify_sub

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
)

type dingtalk struct {
	logger *glog.Logger

	in  NotifySubIn
	cfg model.MessageNotifySubInfo
	pc  model.AccessAddrCallback
}

func NewDingtalk(in NotifySubIn, cfg model.MessageNotifySubInfo, pc model.AccessAddrCallback) Sender {
	return &dingtalk{
		logger: glog.Module("notify_sub", "dingtalk"),
		in:     in,
		cfg:    cfg,
		pc:     pc,
	}
}

func (d *dingtalk) Send(ctx context.Context, userIDs model.Int64Array, notifyData model.MessageNotifyCommon) error {
	logger := d.logger.WithContext(ctx).With("user_ids", userIDs).With("notify_data", notifyData)
	logger.Info("send dingtalk notify_sub")

	var forum model.Forum
	if notifyData.ForumID > 0 {
		err := d.in.Forum.GetByID(ctx, &forum, notifyData.ForumID)
		if err != nil {
			logger.WithErr(err).Warn("get forum failed")
			return err
		}
	}

	data := notifyData.Dingtalk(ctx, d.pc, forum)
	if data == nil {
		logger.Info("no dingtalk data, skip")
		return nil
	}

	err := d.send(ctx, logger, data, userIDs)
	if err != nil {
		logger.WithErr(err).Warn("send notify failed")
		return err
	}

	return nil
}

func (d *dingtalk) send(ctx context.Context, logger *glog.Logger, notifyData *model.MessageNotifyDingtalk, userIDs model.Int64Array) error {
	accessToken, err := d.getAccessToken(ctx, d.cfg)
	if err != nil {
		logger.WithErr(err).Warn("get dingtalk access token failed")
		return err
	}

	return d.in.User.NotifySubBatchProcess(ctx, 20, func(uns []model.UserNotiySub) error {
		thirdIDs := make([]string, len(uns))
		for i, v := range uns {
			thirdIDs[i] = v.ThirdID
		}

		paramBytes, err := json.Marshal(notifyData)
		if err != nil {
			return err
		}

		reqBytes, err := json.Marshal(map[string]any{
			"robotCode": d.cfg.ClientID,
			"userIds":   thirdIDs,
			"msgKey":    "sampleMarkdown",
			"msgParam":  string(paramBytes),
		})

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend", bytes.NewReader(reqBytes))
		if err != nil {
			logger.WithErr(err).Warn("new dingtalk notify sub req failed")
			return nil
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("x-acs-dingtalk-access-token", accessToken)

		resp, err := util.HTTPClient.Do(req)
		if err != nil {
			logger.WithErr(err).Warn("do dingtalk notify sub req failed")
			return nil
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			reqBody, _ := io.ReadAll(resp.Body)
			logger.With("status_code", resp.StatusCode).With("body", string(reqBody)).Warn("send dingtalk notify sub status code abnormal")
			return nil
		} else {
			io.Copy(io.Discard, resp.Body)
		}

		return nil
	},
		repo.QueryWithEqual("user_id", userIDs, repo.EqualOPEqAny),
		repo.QueryWithEqual("type", model.MessageNotifySubTypeDingtalk))
}

func (d *dingtalk) getAccessToken(ctx context.Context, sub model.MessageNotifySubInfo) (string, error) {
	reqBytes, err := json.Marshal(map[string]string{
		"appKey":    sub.ClientID,
		"appSecret": sub.ClientSecret,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.dingtalk.com/v1.0/oauth2/accessToken", bytes.NewReader(reqBytes))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := util.HTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("get access token status code: %d", resp.StatusCode)
	}

	var res struct {
		AccessToken string `json:"accessToken"`
		ExpireIn    int    `json:"expireIn"`
	}
	err = json.NewDecoder(resp.Body).Decode(&res)
	if err != nil {
		return "", err
	}

	if res.AccessToken == "" {
		return "", errors.New("empty access token")
	}

	return res.AccessToken, nil
}
