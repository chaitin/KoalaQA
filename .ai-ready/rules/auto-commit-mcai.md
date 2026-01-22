# Auto Commit .monkeycode-ai Changes Rule

When any file within the `.monkeycode-ai` directory is modified, created, or deleted, you must commit and push these changes to the remote repository before completing the task.

## Required Steps

1. Stage the changes:
   ```bash
   git add .monkeycode-ai/
   ```

2. Commit with a descriptive message:
   ```bash
   git commit -m "Update .monkeycode-ai configuration"
   ```

3. Push to remote:
   ```bash
   git push
   ```

## Guidelines

- Perform the commit and push at the end of the task, after all `.monkeycode-ai` modifications are complete
- Use clear, descriptive commit messages that explain what was changed
- If multiple files were modified, you may group them in a single commit
- If the push fails due to remote changes, pull first and resolve any conflicts before pushing again
- Do not skip this step even if other parts of the task failed
