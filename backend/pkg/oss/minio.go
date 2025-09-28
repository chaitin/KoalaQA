package oss

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"path"
	"path/filepath"
	"slices"
	"strings"

	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type minioClient struct {
	logger      *glog.Logger
	mc          *minio.Client
	buckets     []string
	maxFileSize int
}

func (mc *minioClient) Upload(ctx context.Context, dir string, reader io.Reader, optFuncs ...optFunc) (string, error) {
	dir = strings.TrimPrefix(dir, "/")
	o := getOpt(optFuncs...)

	if o.public {
		dir = path.Join("public", dir)
	}

	if o.ext != "" && !strings.HasPrefix(o.ext, ".") {
		return "", errors.New("invalid ext format")
	}

	if o.fileSize < 1 {
		data, err := io.ReadAll(reader)
		if err != nil {
			return "", err
		}

		reader = bytes.NewReader(data)
		o.fileSize = len(data)
	}

	if o.limitSize {
		if mc.maxFileSize == 0 {
			mc.logger.Warn("max_file_size not configure, skip check file_size")
		} else if o.fileSize > mc.maxFileSize {
			return "", ErrFileSizeOverflow
		}
	}

	if o.bucket == "" {
		o.bucket = mc.buckets[0]
	} else if !slices.Contains(mc.buckets, o.bucket) {
		return "", ErrBucketNotConfigure
	}

	putOpt := minio.PutObjectOptions{
		ContentType: "application/octet-stream",
	}
	if o.filename == "" {
		o.filename = uuid.New().String()
		if o.ext != "" {
			o.filename += o.ext
		}
	} else {
		filenameExt := filepath.Ext(o.filename)
		if filenameExt != "" && o.ext == "" {
			o.ext = filenameExt
		}
	}

	if o.ext != "" {
		contentType := mime.TypeByExtension(strings.ToLower(o.ext))
		if contentType != "" {
			putOpt.ContentType = contentType
		} else {
			mc.logger.WithContext(ctx).With("ext", o.ext).Warn("content-type not found, use application/octet-stream")
		}
	} else {
		mc.logger.Warn("content-type not found, use application/octet-stream")
	}

	fullFilename := filepath.Join(dir, o.filename)

	_, err := mc.mc.PutObject(ctx, o.bucket, fullFilename, reader, int64(o.fileSize), putOpt)
	if err != nil {
		return "", err
	}

	if o.retURL {
		return mc.Sign(ctx, fullFilename, WithBucket(o.bucket), WithSignTimeout(o.signTimeout), WithSignURL(o.signURL))
	}

	return path.Join("/", o.bucket, fullFilename), nil
}

func (mc *minioClient) Delete(ctx context.Context, path string, optFuncs ...optFunc) error {
	path = strings.TrimPrefix(path, "/")
	o := getOpt(optFuncs...)

	if o.bucket == "" {
		o.bucket = mc.buckets[0]
	}

	mc.logger.WithContext(ctx).With("bucket", o.bucket).With("path", path).Info("remove minio objects")

	objects := mc.mc.ListObjects(ctx, o.bucket, minio.ListObjectsOptions{
		Prefix:    path,
		Recursive: true,
	})

	errC := mc.mc.RemoveObjects(ctx, o.bucket, objects, minio.RemoveObjectsOptions{})
	for err := range errC {
		mc.logger.WithContext(ctx).WithErr(err.Err).With("object", err.ObjectName).Warn("delete object failed")
	}
	return nil
}

func (mc *minioClient) Download(ctx context.Context, path string, optFuncs ...optFunc) (io.ReadCloser, error) {
	path = strings.TrimPrefix(path, "/")
	o := getOpt(optFuncs...)

	if o.bucket == "" {
		o.bucket = mc.buckets[0]
	}
	return mc.mc.GetObject(ctx, o.bucket, path, minio.GetObjectOptions{})
}

func (mc *minioClient) Sign(ctx context.Context, path string, optFuncs ...optFunc) (string, error) {
	path = strings.TrimPrefix(path, "/")

	o := getOpt(optFuncs...)

	if o.bucket == "" {
		o.bucket = mc.buckets[0]
	}

	var signURL *url.URL
	if o.signURL != "" {
		var err error
		signURL, err = util.ParseHTTP(o.signURL)
		if err != nil {
			return "", err
		}
	}

	header := make(http.Header)
	if signURL != nil {
		header.Set("Host", signURL.Host)
	}

	u, err := mc.mc.PresignHeader(ctx, http.MethodGet, o.bucket, path, o.signTimeout, url.Values{}, header)
	if err != nil {
		return "", err
	}

	if signURL != nil {
		u.Scheme = signURL.Scheme
		u.Host = signURL.Host
	}

	mc.logger.WithContext(ctx).With("bucket", o.bucket).With("sign_object", path).With("sign_url", u.String()).Debug("sign object url")

	return u.String(), nil
}

func initMinio(ctx context.Context, mc *minio.Client, buckets ...string) error {
	if len(buckets) == 0 {
		return ErrBucketNotConfigure
	}
	for _, bucket := range buckets {
		exist, err := mc.BucketExists(ctx, bucket)
		if err != nil {
			return err
		}

		if exist {
			continue
		}

		err = mc.MakeBucket(ctx, bucket, minio.MakeBucketOptions{Region: "us-east-1"})
		if err != nil {
			return err
		}

		err = mc.SetBucketPolicy(ctx, bucket, fmt.Sprintf(`{
			"Version": "2012-10-17",
			"Statement": [
				{
					"Action": ["s3:GetObject"],
					"Effect": "Allow",
					"Principal": "*",
					"Resource": ["arn:aws:s3:::%s/public/*"],
					"Sid": "PublicRead"
				}
			]
		}`, bucket))
		if err != nil {
			return err
		}
	}

	return nil
}

func newMinio(cfg config.Config) (Client, error) {
	glog.With("oss", cfg.OSS).Debug("connect minio")
	mc, err := minio.New(cfg.OSS.Minio.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.OSS.Minio.AccessKey, cfg.OSS.Minio.SecretKey, ""),
		Secure: false,
	})
	if err != nil {
		return nil, err
	}

	err = initMinio(context.Background(), mc, cfg.OSS.Minio.Buckets...)
	if err != nil {
		return nil, err
	}

	client := &minioClient{
		mc:          mc,
		logger:      glog.Module("oss", "minio"),
		buckets:     cfg.OSS.Minio.Buckets,
		maxFileSize: cfg.OSS.Minio.MaxFileSize,
	}

	return client, nil
}

func init() {
	mime.AddExtensionType(".webp", "image/webp")
	mime.AddExtensionType(".awebp", "image/webp")
	mime.AddExtensionType(".avis", "image/avif")
	mime.AddExtensionType(".avif", "image/avif")
	mime.AddExtensionType(".image", "image/jpeg")
	mime.AddExtensionType(".md", "text/markdown")
	mime.AddExtensionType(".pdf", "application/pdf")
	mime.AddExtensionType(".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	mime.AddExtensionType(".xls", "application/vnd.ms-excel")
	mime.AddExtensionType(".doc", "application/msword")
	mime.AddExtensionType(".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
	mime.AddExtensionType(".ppt", "application/vnd.ms-powerpoint")
	mime.AddExtensionType(".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
}
