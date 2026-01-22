# File Read Limit Rule

When reading files, limit each read operation to a maximum of 200 lines at a time. For files larger than 200 lines, read them in segments.

## Guidelines

1. **Initial Read**: Start by reading the first 200 lines of the file
2. **Subsequent Reads**: Use offset and limit parameters to read additional segments as needed
3. **Targeted Reading**: If you know the specific line range you need, read only that segment

## Example Usage

```
# First segment (lines 1-200)
Read file with limit=200

# Second segment (lines 201-400)
Read file with offset=200, limit=200

# Third segment (lines 401-600)
Read file with offset=400, limit=200
```

## Exceptions

- Small files (under 200 lines) can be read in a single operation
- When the user explicitly requests reading an entire file at once
- When searching for specific content where segmented reading would be inefficient

## Rationale

- Reduces context window usage
- Improves response time for large files
- Encourages focused reading of relevant sections
- Prevents unnecessary loading of entire large files
