package batch

import (
	"context"
	"sort"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
)

func statExec(repoStat *repo.Stat) func(data []model.StatInfo) error {
	return func(data []model.StatInfo) error {
		c := make([]model.Stat, 0, len(data))
		indexM := make(map[string]int)
		tsM := make(map[int64]int64)

		for _, v := range data {
			id := v.UUID()
			index, ok := indexM[id]
			if !ok {
				stat := model.Stat{
					StatInfo: v,
					Count:    1,
				}

				if ts, ok := tsM[v.Ts]; ok {
					stat.DayTs = ts
				} else {
					stat.DayTs = util.DayTrunc(time.Unix(v.Ts, 0)).Unix()
					tsM[v.Ts] = stat.DayTs
				}

				c = append(c, stat)

				indexM[id] = len(c) - 1
				continue
			}

			c[index].Count++
		}

		sort.Slice(c, func(i, j int) bool {
			return c[i].Type < c[j].Type || c[i].Ts < c[j].Ts || c[i].Key < c[j].Key
		})

		return repoStat.Create(context.Background(), c...)
	}
}

func newStatBatcher(repoStat *repo.Stat) Batcher[model.StatInfo] {
	return newBatcher("stat", statExec(repoStat))
}
