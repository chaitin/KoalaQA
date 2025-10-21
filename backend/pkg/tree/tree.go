package tree

type Node[T any] struct {
	Parent   *Node[T]   `json:"-"`
	Value    T          `json:"value"`
	Children []*Node[T] `json:"children"`
}

func (n *Node[T]) Range(f func(value T)) {
	if n == nil {
		return
	}

	f(n.Value)

	for _, child := range n.Children {
		child.Range(f)
	}
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
