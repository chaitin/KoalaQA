# No Long-Running Commands Rule

When using command execution tools (such as Bash, shell, or terminal tools), do not execute commands that may run for an extended period of time.

## Prohibited Commands

- `watch` - continuous monitoring
- `tail -f` - following log files indefinitely
- `top`, `htop` - interactive process monitors
- `ping` without count limit (`-c`)
- `sleep` with large values
- Infinite loops (`while true`, `for (;;)`)
- Long-running servers or daemons
- `npm start`, `yarn start`, `python -m http.server` without background mode
- Database migrations on large datasets
- Large file downloads without timeout
- `find` or `grep` on entire filesystem without path constraints

## Best Practices

- Always set timeouts for network operations
- Use `--timeout` or `-c` flags where available
- Use `timeout <time_limit> <command>` command to wrap execution with a time limit
- Run potentially long operations as subagent or with background task
- Prefer quick, bounded operations
- If a long-running command is required, inform the user and ask for confirmation first
