package tree

type Node[T any] struct {
	Parent   *Node[T]   `json:"-"`
	Value    T          `json:"value"`
	Children []*Node[T] `json:"children"`
}

func (n *Node[T]) Range(parent T, f func(parent, value T) error) error {
	if n == nil {
		return nil
	}

	err := f(parent, n.Value)
	if err != nil {
		return err
	}

	for _, child := range n.Children {
		err = child.Range(n.Value, f)
		if err != nil {
			return err
		}
	}

	return nil
}

func (n *Node[T]) AddChild(value T) {
	New(n, value)
}

func Convert[T any, Y any](n *Node[T], f func(n *Node[T]) Y) *Node[Y] {
	cNode := New(nil, f(n))

	for _, child := range n.Children {
		cNode.Children = append(cNode.Children, Convert(child, f))
	}

	return cNode
}

func New[T any](parent *Node[T], value T) *Node[T] {
	n := &Node[T]{
		Parent:   parent,
		Value:    value,
		Children: make([]*Node[T], 0),
	}

	if parent == nil {
		n.Parent = n
	} else {
		parent.Children = append(parent.Children, n)
	}

	return n
}
