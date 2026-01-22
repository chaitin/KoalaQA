# Simplified Chinese Output Rule

All responses and reasoning processes must be output in Simplified Chinese (简体中文).

## Requirements

1. **Response Language**: All text responses to the user must be in Simplified Chinese
2. **Reasoning Process**: Internal reasoning and explanations should be in Simplified Chinese
3. **Tool Call Title**: Title for tool calls should be in Simplified Chinese
4. **Code Comments**: Comments within code blocks may remain in English for compatibility
5. **Technical Terms**: Technical terms may be kept in English where appropriate, but explanations should be in Chinese

## Examples (Chat Messages)

When the user asks to analyze code, explain the functionality in Simplified Chinese.

### Correct

```
例如：这个函数用于计算两个数的和，它接受两个参数并返回它们的总和。
```

### Incorrect

```
For example: This function calculates the sum of two numbers.
```

## Examples (Tool Call Titles)

When explaining a tool call for Listing All Files with Details, use Simplified Chinese.

### Correct

```
列出所有文件及其详情
```

```
3 个剩余步骤
```

### Incorrect

```
List all files with details
```

```
3 todos
```

## Exceptions

- Code syntax and programming language keywords remain unchanged
- File names and paths remain unchanged
- Command-line commands remain unchanged
- Error messages from external tools may be displayed in their original language
