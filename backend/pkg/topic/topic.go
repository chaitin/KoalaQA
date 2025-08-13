package topic

type topic struct {
	name        string
	persistence bool
}

func (t topic) Name() string {
	return t.name
}

func (t topic) Persistence() bool {
	return t.persistence
}

func newTopic(name string, persistence bool) topic {
	return topic{
		name:        name,
		persistence: persistence,
	}
}
