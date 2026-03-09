package keyword

import (
	"fmt"
	"testing"
)

func TestMatcherAppend(t *testing.T) {
	matcher := NewMatcher()
	matcher.AddKeyword("he", "she", "his", "hers")

	input := []rune("ushers")
	expected := []bool{false, false, false, true, false, true}

	for i, r := range input {
		matcher.Append(r)
		if got := matcher.IsKeyword(); got != expected[i] {
			t.Fatalf("unexpected keyword flag at index %d: want %v, got %v", i, expected[i], got)
		}
	}
}

func TestMatcherClear(t *testing.T) {
	matcher := NewMatcher()
	matcher.AddKeyword("ab")

	matcher.Append('a')
	matcher.Append('b')
	if !matcher.IsKeyword() {
		t.Fatal("matcher should detect keyword once completed")
	}

	matcher.Clear()
	matcher.Append('x')
	if matcher.IsKeyword() {
		t.Fatal("non-keyword rune must not be treated as keyword")
	}
}

func TestMatcherFailedAndDepth(t *testing.T) {
	matcher := NewMatcher()
	matcher.AddKeyword("ab")
	matcher.Build()

	matcher.Append('a')
	if matcher.Failed() {
		t.Fatal("unexpected fail when matching existing edge")
	}
	if depth := matcher.Depth(); depth != 1 {
		t.Fatalf("depth mismatch after matching prefix: want 1, got %d", depth)
	}

	matcher.Append('x')
	if !matcher.Failed() {
		t.Fatal("matcher should report fail when following fail links")
	}
	if depth := matcher.Depth(); depth != 0 {
		t.Fatalf("depth mismatch after fallback: want 0, got %d", depth)
	}
}

func TestCursorIsolation(t *testing.T) {
	matcher := NewMatcher()
	matcher.AddKeyword("he")
	matcher.Build()

	cursorA := matcher.NewCursor()
	cursorB := matcher.NewCursor()

	cursorA.Append('h')
	cursorB.Append('s')

	if cursorA.IsKeyword() {
		t.Fatal("cursorA should not match yet")
	}
	if cursorB.IsKeyword() {
		t.Fatal("cursorB should not match for unrelated sequence")
	}

	cursorA.Append('e')
	if !cursorA.IsKeyword() {
		t.Fatal("cursorA should match keyword 'he'")
	}
	if cursorB.IsKeyword() {
		t.Fatal("cursorB should remain unaffected by cursorA")
	}
}

func TestXxx(t *testing.T) {
	matcher := NewMatcher()
	matcher.AddKeyword("工商银行", "商业")
	matcher.Build()

	cursorA := matcher.NewCursor()

	cursorA.Append('工')
	fmt.Println(cursorA.Failed(), cursorA.Depth())
	cursorA.Append('商')
	fmt.Println(cursorA.Failed(), cursorA.Depth())
	cursorA.Append('业')
	fmt.Println(cursorA.Failed(), cursorA.Depth())
}
