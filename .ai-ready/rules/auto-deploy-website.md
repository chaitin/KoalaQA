# Auto Deploy Website Rule

When the user's task involves creating or modifying web projects, automatically deploy the website for preview using the `/deploy-website` skill.

## Trigger Conditions

Deploy the website when any of the following conditions are met:

1. **Static HTML files created or modified**
   - New `.html` files created in the workspace
   - Existing `.html` files modified with significant changes

2. **Node.js web project**
   - Project contains `package.json` with web-related scripts (e.g., `dev`, `start`, `serve`)
   - Frameworks detected: Next.js, Nuxt.js, Vite, Create React App, Vue CLI, Angular, etc.

## How to Use

After completing the web development task, invoke the skill:

```
/deploy-website
```

The skill will automatically detect the project type and start the appropriate server.
