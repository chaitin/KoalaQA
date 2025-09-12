package repo

import (
	"strings"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/util"
)

type eqOP uint

const (
	EqualOPEq eqOP = iota + 1
	EqualOPIn
	EqualOPEqAny
	EqualOPIntesect
	EqualOPInclude
)

type eqVal struct {
	op eqOP
	v  any
}

type queryOpt struct {
	columns []string
	page    *model.Pagination

	equals  map[string]eqVal
	ilikes  map[string]string
	orderBy []string
}

func (lo *queryOpt) Scopes() []database.Scope {
	return []database.Scope{
		selectColumnScope(lo.columns),
		paginationScope(lo.page),
		ilikeScope(lo.ilikes),
		equalScope(lo.equals),
		orderByScope(lo.orderBy),
	}
}

type QueryOptFunc func(*queryOpt)

func QueryWithPagination(page *model.Pagination) QueryOptFunc {
	return func(lo *queryOpt) {
		lo.page = page
	}
}

func QueryWithSelectColumn(columns ...string) QueryOptFunc {
	return func(lo *queryOpt) {
		lo.columns = columns
	}
}

func QueryWithEqual(key string, val any, op ...eqOP) QueryOptFunc {
	return func(lo *queryOpt) {
		if util.IsNil(val) {
			return
		}
		if lo.equals == nil {
			lo.equals = make(map[string]eqVal)
		}

		o := EqualOPEq
		if len(op) > 0 {
			o = op[0]
		}

		lo.equals[key] = eqVal{
			op: o,
			v:  val,
		}
	}
}

func QueryWithILike(key string, val *string) QueryOptFunc {
	return func(lo *queryOpt) {
		if util.IsNil(val) {
			return
		}
		if lo.ilikes == nil {
			lo.ilikes = make(map[string]string)
		}

		lo.ilikes[key] = *val
	}
}

func QueryWithOrderBy(orderBy ...string) QueryOptFunc {
	return func(qo *queryOpt) {
		qo.orderBy = append(qo.orderBy, orderBy...)
	}
}

func getQueryOpt(funcs ...QueryOptFunc) (o queryOpt) {
	for _, f := range funcs {
		f(&o)
	}

	return
}

func selectColumnScope(columns []string) database.Scope {
	return func(db *database.DB) *database.DB {
		if len(columns) == 0 {
			return db
		}

		return db.Select(columns)
	}
}

func equalScope(kv map[string]eqVal) database.Scope {
	return func(db *database.DB) *database.DB {
		for k, v := range kv {
			switch v.op {
			case EqualOPEq:
				db = db.Where(k+" = ?", v.v)
			case EqualOPIn:
				db = db.Where(k+" IN (?)", v.v)
			case EqualOPEqAny:
				db = db.Where(k+" = ANY(?)", v.v)
			case EqualOPIntesect:
				db = db.Where(k+" && ?", v.v)
			case EqualOPInclude:
				db = db.Where(k+" @> ?", v.v)
			}
		}

		return db
	}
}

func ilikeScope(kv map[string]string) database.Scope {
	return func(db *database.DB) *database.DB {
		for k, v := range kv {
			db = db.Scopes(iLikeQuery(v).Scope(k))
		}
		return db
	}
}

func paginationScope(page *model.Pagination) database.Scope {
	return func(db *database.DB) *database.DB {
		if page == nil {
			return db
		}

		if page.Page < 1 {
			page.Page = 1
		}

		if page.Size < 1 {
			page.Size = 20
		}

		return db.Limit(page.Size).Offset((page.Page - 1) * page.Size)
	}
}

func orderByScope(orderBy []string) database.Scope {
	return func(db *database.DB) *database.DB {
		if len(orderBy) == 0 {
			return db
		}

		return db.Order(strings.Join(orderBy, ","))
	}
}

type iLikeQuery string

func (i iLikeQuery) Scope(column ...string) database.Scope {
	return func(db *database.DB) *database.DB {
		if len(i) == 0 || len(column) == 0 {
			return db
		}

		data := "%" + util.EscapeLike(string(i)) + "%"
		sql := ""
		v := make([]interface{}, 0)
		for i, c := range column {
			if i == 0 {
				sql = c + " ILIKE ?"
				v = append(v, data)
				continue
			}

			sql = sql + " OR " + c + " ILIKE ?"
			v = append(v, data)
		}

		return db.Where(sql, v...)
	}
}
