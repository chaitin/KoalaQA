# AGENTS.md

This document defines the rules and guidelines that AI agents on behalf of MonkeyCode-AI Smart Development Platform must follow when working in this repository.

## Output Format

Do not include any emoji characters in your output. Keep all responses in plain text format using only standard ASCII or Unicode text characters.

## Language

All responses and reasoning processes must be output in Simplified Chinese (简体中文).

- Response text to the user must be in Simplified Chinese
- Reasoning and explanations should be in Simplified Chinese
- Code comments may remain in English for compatibility
- Technical terms may be kept in English where appropriate, but explanations should be in Chinese
- Code syntax, file names, paths, and commands remain unchanged

## Shell Commands

### Comment Style

When generating shell commands in documentation, do not use inline end-of-line comments. Place comments on a separate line above the command.

```bash
# Correct: comment above the command
npm install express

# Incorrect: do not use inline comments like this
# npm install express  # Install Express framework
```

### Prohibited Long-Running Commands

Do not execute commands that may run for an extended period:

- `watch` - continuous monitoring
- `tail -f` - following log files indefinitely
- `top`, `htop` - interactive process monitors
- `ping` without count limit (`-c`)
- `sleep` with large values
- Infinite loops (`while true`, `for (;;)`)
- Long-running servers without background mode
- `find` or `grep` on entire filesystem without path constraints

Best practices:

- Always set timeouts for network operations
- Use `timeout <time_limit> <command>` to wrap execution with a time limit
- Run potentially long operations as background tasks
- If a long-running command is required, ask the user for confirmation first

### Prohibited System Administration Commands

Do not execute system administration commands that require root privileges:

- **Network/Firewall**: `iptables`, `ufw`, `firewalld`, `nftables`
- **System Config**: `sysctl`, `modprobe`, `update-grub`
- **Service Management**: `systemctl`, `service`, `init`
- **User Management**: `useradd`, `userdel`, `passwd`, `visudo`
- **Package Management**: `apt`, `yum`, `dnf`, `pacman`
- **Disk Operations**: `mount`, `fdisk`, `mkfs`, `lvm`
- **Privilege Escalation**: `sudo`, `su`, `chroot`
- **Power Control**: `shutdown`, `reboot`, `poweroff`

If such commands are necessary, inform the user and ask them to execute manually.

## Auto Commit Rules

When any file within the `.monkeycode-ai` directory is modified, created, or deleted, commit and push these changes before completing the task:

```bash
# Stage changes
git add .monkeycode-ai/

# Commit with descriptive message
git commit -m "Update .monkeycode-ai configuration"

# Push to remote
git push
```

## Auto Deploy Website

When creating or modifying web projects, automatically deploy for preview using the `/deploy-website` skill when:

- Static HTML files are created or modified
- Node.js web project with frameworks like Next.js, Vite, React, Vue, Angular, etc.
