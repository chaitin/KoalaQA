# Shell Command Comment Style Rule

When generating shell commands in documentation (such as Markdown files, README, or other docs), do not use inline end-of-line comments. Instead, place comments on a separate line above the command.

## Incorrect (Do Not Use)

```bash
npm install express  # Install Express framework
cd /var/log && ls -la  # Navigate to logs and list files
```

## Correct (Use This Style)

```bash
# Install Express framework
npm install express

# Navigate to logs and list files
cd /var/log && ls -la
```

## Rationale

- End-of-line comments can cause issues when copying and pasting commands
- Some shells may not handle inline comments correctly
- Comments above commands are more readable and easier to maintain
- This style is consistent with most shell scripting best practices
