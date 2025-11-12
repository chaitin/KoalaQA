package batch

import (
	"context"
	"sort"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

func statExec(repoStat *repo.Stat) func(data []model.StatInfo) error {
	return func(data []model.StatInfo) error {
		c := make([]model.Stat, 0, len(data))
		indexM := make(map[string]int)

		for _, v := range data {
			id := v.UUID()
			index, ok := indexM[id]
			if !ok {
				c = append(c, model.Stat{
					StatInfo: v,
					Count:    1,
				})
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
