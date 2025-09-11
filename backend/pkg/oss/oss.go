package oss

import (
	"context"
	"errors"
	"io"
	"time"
)

var (
	ErrFileSizeOverflow   = errors.New("file size overflow")
	ErrBucketNotConfigure = errors.New("bucket not configure")
	global                Client
)

type opt struct {
	bucket    string
	filename  string
	limitSize bool
	fileSize  int // 设置文件大小，可以避免读出整个 reader 获取大小
	ext       string

	public      bool
	retURL      bool
	signTimeout time.Duration
}

func getOpt(optFuncs ...optFunc) opt {
	o := opt{
		signTimeout: time.Minute * 10,
	}

	for _, optFunc := range optFuncs {
		optFunc(&o)
	}

	return o
}

type optFunc func(o *opt)

func WithBucket(bucket string) optFunc {
	return func(o *opt) {
		o.bucket = bucket
	}
}

func WithFilename(filename string) optFunc {
	return func(o *opt) {
		o.filename = filename
	}
}

func WithLimitSize() optFunc {
	return func(o *opt) {
		o.limitSize = true
	}
}

func WithFileSize(fileSize int) optFunc {
	return func(o *opt) {
		o.fileSize = fileSize
	}
}

func WithExt(ext string) optFunc {
	return func(o *opt) {
		o.ext = ext
	}
}

func WithPublic() optFunc {
	return func(o *opt) {
		o.public = true
	}
}

func WithRetSignURL() optFunc {
	return func(o *opt) {
		o.retURL = true
	}
}

func WithSignTimeout(t time.Duration) optFunc {
	return func(o *opt) {
		o.signTimeout = t
	}
}

type Client interface {
	Upload(ctx context.Context, dir string, reader io.Reader, optFuncs ...optFunc) (string, error)
	Delete(ctx context.Context, path string, optFuncs ...optFunc) error
	Download(ctx context.Context, path string, optFuncs ...optFunc) (io.ReadCloser, error)
	Sign(ctx context.Context, path string, optFuncs ...optFunc) (string, error)
}

func Upload(ctx context.Context, dir string, reader io.Reader, optFuncs ...optFunc) (string, error) {
	if global == nil {
		return "", errors.New("global client is nil")
	}
	return global.Upload(ctx, dir, reader, optFuncs...)
}

func Download(ctx context.Context, path string, optFuncs ...optFunc) (io.ReadCloser, error) {
	if global == nil {
		return nil, errors.New("global client is nil")
	}
	return global.Download(ctx, path, optFuncs...)
}
