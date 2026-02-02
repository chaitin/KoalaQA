package chat

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	openapi "github.com/alibabacloud-go/darabonba-openapi/v2/client"
	dingtalkcard_1_0 "github.com/alibabacloud-go/dingtalk/card_1_0"
	dingtalkoauth2_1_0 "github.com/alibabacloud-go/dingtalk/oauth2_1_0"
	util "github.com/alibabacloud-go/tea-utils/v2/service"
	"github.com/alibabacloud-go/tea/tea"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/google/uuid"
	"github.com/open-dingtalk/dingtalk-stream-sdk-go/chatbot"
	"github.com/open-dingtalk/dingtalk-stream-sdk-go/client"
)

type dingtalk struct {
	cfg         model.SystemChatConfig
	botCallback BotCallback

	logger     *glog.Logger
	streamCli  *client.StreamClient
	oauthCli   *dingtalkoauth2_1_0.Client
	cardCli    *dingtalkcard_1_0.Client
	tokenCache token
}

func (d *dingtalk) accessToken() (string, error) {
	if d.tokenCache.expired() {
		_, err, _ := sf.Do("access_token_dingtalk", func() (interface{}, error) {
			if !d.tokenCache.expired() {
				return nil, nil
			}

			request := &dingtalkoauth2_1_0.GetAccessTokenRequest{
				AppKey:    tea.String(d.cfg.ClientID),
				AppSecret: tea.String(d.cfg.ClientSecret),
			}

			resp, err := d.oauthCli.GetAccessToken(request)
			if err != nil {
				return nil, err
			}

			if *resp.StatusCode != http.StatusOK {
				return nil, fmt.Errorf("get access_token status code: %d", *resp.StatusCode)
			}

			d.tokenCache = token{
				token:    *resp.Body.AccessToken,
				expireAt: time.Now().Add(time.Duration(*resp.Body.ExpireIn) * time.Second),
			}
			return nil, nil
		})
		if err != nil {
			return "", err
		}
	}

	return d.tokenCache.token, nil
}

func (d *dingtalk) CreateAndDeliverCard(ctx context.Context, trackID string, data *chatbot.BotCallbackDataModel) error {
	logger := d.logger.WithContext(ctx).With("track_id", trackID)
	accessToken, err := d.accessToken()
	if err != nil {
		logger.WithErr(err).Error("get access token failed")
		return err
	}

	createAndDeliverHeaders := &dingtalkcard_1_0.CreateAndDeliverHeaders{}
	createAndDeliverHeaders.XAcsDingtalkAccessToken = tea.String(accessToken)

	cardDataCardParamMap := map[string]*string{
		"content": tea.String(""),
	}
	cardData := &dingtalkcard_1_0.CreateAndDeliverRequestCardData{
		CardParamMap: cardDataCardParamMap,
	}

	createAndDeliverRequest := &dingtalkcard_1_0.CreateAndDeliverRequest{
		CardTemplateId: tea.String(d.cfg.TemplateID),
		OutTrackId:     tea.String(trackID),
		CardData:       cardData,
		CallbackType:   tea.String("STREAM"),
		ImGroupOpenSpaceModel: &dingtalkcard_1_0.CreateAndDeliverRequestImGroupOpenSpaceModel{
			SupportForward: tea.Bool(true),
		},
		ImRobotOpenSpaceModel: &dingtalkcard_1_0.CreateAndDeliverRequestImRobotOpenSpaceModel{
			SupportForward: tea.Bool(true),
		},
		UserIdType: tea.Int32(1),
	}
	switch data.ConversationType {
	case "2": // 群聊
		openSpaceId := fmt.Sprintf("dtv1.card//%s.%s", "IM_GROUP", data.ConversationId)
		createAndDeliverRequest.SetOpenSpaceId(openSpaceId)
		createAndDeliverRequest.SetImGroupOpenDeliverModel(
			&dingtalkcard_1_0.CreateAndDeliverRequestImGroupOpenDeliverModel{
				RobotCode: tea.String(d.cfg.ClientID),
			})
	case "1": // Im机器人单聊
		openSpaceId := fmt.Sprintf("dtv1.card//%s.%s", "IM_ROBOT", data.SenderStaffId)
		createAndDeliverRequest.SetOpenSpaceId(openSpaceId)
		createAndDeliverRequest.SetImRobotOpenDeliverModel(&dingtalkcard_1_0.CreateAndDeliverRequestImRobotOpenDeliverModel{
			SpaceType: tea.String("IM_GROUP"),
		})
	default:
		return fmt.Errorf("invalid conversation type: %s", data.ConversationType)
	}

	_, err = d.cardCli.CreateAndDeliverWithOptions(createAndDeliverRequest, createAndDeliverHeaders, &util.RuntimeOptions{})
	if err != nil {
		logger.WithErr(err).Error("create and deliver card failed")
		return err
	}
	return nil
}

func (d *dingtalk) UpdateAIStreamCard(ctx context.Context, trackID, content string, isFinalize bool) error {
	logger := d.logger.WithContext(ctx).With("track_id", trackID)

	accessToken, err := d.accessToken()
	if err != nil {
		logger.WithErr(err).Error("get access token failed")
		return err
	}

	headers := &dingtalkcard_1_0.StreamingUpdateHeaders{
		XAcsDingtalkAccessToken: tea.String(accessToken),
	}
	request := &dingtalkcard_1_0.StreamingUpdateRequest{
		OutTrackId: tea.String(trackID),
		Guid:       tea.String(uuid.New().String()),
		Key:        tea.String("content"),
		Content:    tea.String(content),
		IsFull:     tea.Bool(true),
		IsFinalize: tea.Bool(isFinalize),
		IsError:    tea.Bool(false),
	}
	_, err = d.cardCli.StreamingUpdateWithOptions(request, headers, &util.RuntimeOptions{})
	if err != nil {
		logger.WithErr(err).Error("update stream failed")
		return err
	}
	return nil
}

func (d *dingtalk) ChatBotCallback(ctx context.Context, data *chatbot.BotCallbackDataModel) ([]byte, error) {
	question := data.Text.Content
	question = strings.TrimSpace(question)
	trackID := uuid.New().String()

	logger := d.logger.WithContext(ctx).With("question", question).
		With("conversation_type", data.ConversationType).With("conversation_id", data.ConversationId)
	logger.Info("receive bot message")

	err := d.CreateAndDeliverCard(ctx, trackID, data)
	if err != nil {
		return nil, err
	}

	err = d.UpdateAIStreamCard(ctx, trackID, fmt.Sprintf("**%s**\n\n正在查找相关信息", question), false)
	if err != nil {
		logger.WithErr(err).Error("update stream card failed")
		return nil, err
	}
	sessionID := "dingtalk_" + data.ConversationId

	stream, err := d.botCallback(ctx, BotReq{
		Type:      TypeDingtalk,
		SessionID: sessionID,
		Question:  question,
	})
	if err != nil {
		logger.WithErr(err).Error("callback failed")
		e := d.UpdateAIStreamCard(ctx, trackID, fmt.Sprintf("**%s**\n\n出错了，请稍后再试", question), true)
		if e != nil {
			logger.WithErr(e).Error("finish ai stream failed")
		}
		return nil, err
	}

	go func() {
		var builder strings.Builder
		builder.WriteString(fmt.Sprintf("**%s**\n\n", question))
		cur := time.Now()
		stream.Read(ctx, func(msg string) {
			if msg == "" {
				return
			}

			builder.WriteString(msg)

			now := time.Now()
			if now.Before(cur.Add(time.Second * 2)) {
				return
			}

			cur = now
			err = d.UpdateAIStreamCard(ctx, trackID, builder.String(), false)
			if err != nil {
				logger.WithErr(err).Warn("update ai stream failed")
			}
		})
		err = d.UpdateAIStreamCard(ctx, trackID, builder.String(), true)
		if err != nil {
			logger.WithErr(err).Warn("finish stream failed")
		}
	}()

	return []byte(""), nil
}

func (d *dingtalk) Start() error {
	cli := client.NewStreamClient(client.WithAppCredential(client.NewAppCredentialConfig(
		d.cfg.ClientID,
		d.cfg.ClientSecret,
	)))

	cli.RegisterChatBotCallbackRouter(d.ChatBotCallback)

	err := cli.Start(context.Background())
	if err != nil {
		return err
	}

	d.streamCli = cli
	return nil
}

func (d *dingtalk) Stop() {
	if d.streamCli == nil {
		return
	}

	d.streamCli.AutoReconnect = false
	d.streamCli.Close()
}

func (d *dingtalk) StreamText(_ context.Context, _ VerifyReq) (string, error) {
	return "", errors.ErrUnsupported
}

func newDingtalk(cfg model.SystemChatConfig, callback BotCallback) (Bot, error) {
	config := &openapi.Config{}
	config.Protocol = tea.String("https")
	config.RegionId = tea.String("central")
	oauthCli, err := dingtalkoauth2_1_0.NewClient(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create oauth client: %w", err)
	}
	cardCli, err := dingtalkcard_1_0.NewClient(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create card client: %w", err)
	}

	return &dingtalk{
		cfg:         cfg,
		botCallback: callback,
		oauthCli:    oauthCli,
		cardCli:     cardCli,
		logger:      glog.Module("chat", "dingtalk"),
	}, err
}
