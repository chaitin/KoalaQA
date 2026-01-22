# No Delete Operations Rule

When using command execution tools (such as Bash, shell, or terminal tools), do not execute any commands that delete files, directories, or data.

## Prohibited Commands

### File and Directory Deletion
- `rm` - remove files
- `rm -r` / `rm -rf` - remove directories recursively
- `rmdir` - remove empty directories
- `unlink` - remove file links
- `shred` - securely delete files

### Database Deletion
- `DROP TABLE` / `DROP DATABASE` - SQL deletion commands
- `DELETE FROM` without proper confirmation
- `TRUNCATE TABLE` - clear table data

### Git Deletion
- `git rm` - remove files from repository
- `git clean -f` - remove untracked files
- `git branch -D` - force delete branches
- `git push origin --delete` - delete remote branches

### Container and Image Deletion
- `docker rm` - remove containers
- `docker rmi` - remove images
- `docker system prune` - remove unused data
- `docker volume rm` - remove volumes

### Package Removal
- `npm uninstall` / `yarn remove` - remove packages (use with caution)
- `pip uninstall` - remove Python packages

### Other Destructive Commands
- `trash` / `trash-put` - move to trash
- Commands with `--delete` flag
- `find ... -delete` - find and delete files

## Exceptions

If a delete operation is absolutely necessary for the task:

1. Inform the user about the specific files/data to be deleted
2. Ask for explicit confirmation before proceeding
3. Suggest the user execute the command manually if it's a critical operation

## Best Practices

- Prefer moving files to a backup location instead of deleting
- Use version control to track changes instead of deleting old files
- When cleaning up, list files first with `ls` or `find` before any removal
- Always double-check the path before any destructive operation
