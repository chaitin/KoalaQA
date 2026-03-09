package keyword

// Matcher implements an incremental AC automaton based keyword matcher.
type Matcher struct {
	root       *node
	built      bool
	dirty      bool
	generation int
	defaultCur *Cursor
}

// Cursor tracks a single matching environment that can advance independently.
type Cursor struct {
	matcher *Matcher
	current *node
	failed  bool
	gen     int
}

type node struct {
	children map[rune]*node
	fail     *node
	baseLens []int
	wordLens []int
	depth    int
}

// NewMatcher creates an empty matcher.
func NewMatcher() *Matcher {
	root := &node{children: make(map[rune]*node)}
	return &Matcher{root: root}
}

// AddKeyword inserts one or more keywords into the automaton.
func (m *Matcher) AddKeyword(words ...string) {
	for _, word := range words {
		if word == "" {
			continue
		}
		m.dirty = true
		wordRunes := []rune(word)
		n := m.root
		for _, r := range wordRunes {
			child, ok := n.children[r]
			if !ok {
				child = &node{children: make(map[rune]*node)}
				n.children[r] = child
			}
			n = child
		}
		n.baseLens = append(n.baseLens, len(wordRunes))
	}
}

// Build finalizes the automaton by computing failure links.
func (m *Matcher) Build() {
	if m.root == nil {
		m.reset()
	}
	if m.dirty {
		m.resetOutputs()
		m.build()
		m.dirty = false
		m.generation++
	}
	m.built = true
	m.defaultCur = nil
}

// Append consumes the next rune and advances the automaton state.
func (m *Matcher) Append(r rune) {
	m.defaultCursor().Append(r)
}

// IsKeyword reports whether the current state corresponds to any keyword.
func (m *Matcher) IsKeyword() bool {
	return m.defaultCursor().IsKeyword()
}

// Failed reports whether the last Append operation fell back along fail links.
func (m *Matcher) Failed() bool {
	return m.defaultCursor().Failed()
}

// Depth returns the current node depth counted from the root.
func (m *Matcher) Depth() int {
	return m.defaultCursor().Depth()
}

// Clear resets the current state to the root node.
func (m *Matcher) Clear() {
	m.defaultCursor().Clear()
}

func (m *Matcher) build() {
	if m.root == nil {
		m.reset()
	}
	m.root.depth = 0
	queue := make([]*node, 0)
	for _, child := range m.root.children {
		child.fail = m.root
		child.depth = 1
		if len(child.fail.wordLens) > 0 {
			child.wordLens = append(child.wordLens, child.fail.wordLens...)
		}
		queue = append(queue, child)
	}
	for len(queue) > 0 {
		n := queue[0]
		queue = queue[1:]
		for r, child := range n.children {
			fail := n.fail
			for fail != nil && fail.children[r] == nil {
				fail = fail.fail
			}
			if fail == nil {
				child.fail = m.root
			} else {
				child.fail = fail.children[r]
			}
			if child.fail == nil {
				child.fail = m.root
			}
			child.depth = n.depth + 1
			if len(child.fail.wordLens) > 0 {
				child.wordLens = append(child.wordLens, child.fail.wordLens...)
			}
			queue = append(queue, child)
		}
	}
}

func (m *Matcher) resetOutputs() {
	if m.root == nil {
		return
	}
	stack := []*node{m.root}
	for len(stack) > 0 {
		n := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		n.wordLens = append(n.wordLens[:0], n.baseLens...)
		for _, child := range n.children {
			stack = append(stack, child)
		}
	}
}

func (m *Matcher) reset() {
	m.root = &node{children: make(map[rune]*node)}
	m.built = false
	m.dirty = false
	m.defaultCur = nil
}

// NewCursor creates a fresh isolated matching cursor sharing the same automaton.
func (m *Matcher) NewCursor() *Cursor {
	if m.root == nil {
		m.reset()
	}
	if !m.built {
		m.Build()
	}
	return &Cursor{matcher: m, current: m.root, gen: m.generation}
}

func (m *Matcher) defaultCursor() *Cursor {
	if m.defaultCur == nil {
		m.defaultCur = m.NewCursor()
	}
	return m.defaultCur
}

// Append consumes the next rune within a cursor and advances its state.
func (c *Cursor) Append(r rune) {
	c.ensureFresh()
	didFail := false
	for c.current != c.matcher.root && c.current.children[r] == nil {
		c.current = c.current.fail
		didFail = true
	}
	if next := c.current.children[r]; next != nil {
		c.current = next
	} else {
		c.current = c.matcher.root
		didFail = true
	}
	c.failed = didFail
}

// IsKeyword reports whether the cursor currently points to any keyword.
func (c *Cursor) IsKeyword() bool {
	c.ensureFresh()
	return len(c.current.wordLens) > 0
}

// Failed reports whether the last Append triggered a fallback along fail links.
func (c *Cursor) Failed() bool {
	c.ensureFresh()
	return c.failed
}

// Depth returns the current node depth counted from the root.
func (c *Cursor) Depth() int {
	c.ensureFresh()
	if c.current == nil {
		return 0
	}
	return c.current.depth
}

// Clear resets the cursor to the root node.
func (c *Cursor) Clear() {
	c.ensureFresh()
	c.current = c.matcher.root
	c.failed = false
}

func (c *Cursor) ensureFresh() {
	if c.matcher == nil {
		return
	}
	if c.matcher.root == nil {
		c.matcher.reset()
	}
	if !c.matcher.built {
		c.matcher.Build()
	}
	if c.gen != c.matcher.generation {
		c.current = c.matcher.root
		c.failed = false
		c.gen = c.matcher.generation
	}
}
