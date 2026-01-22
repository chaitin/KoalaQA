---
name: deploy-website
description: Deploy and serve web projects locally for preview. Automatically detects project type (Node.js or static HTML) and starts the appropriate development server.
arguments:
  - name: workspace
    description: Absolute path to the workspace directory to deploy
    required: false
---

# Deploy Website

Automatically detect the project type and start the appropriate development server.

## Detection Logic

1. **Node.js web project**
   - Look for `package.json` in the workspace root
   - Check if it contains a `dev` or `start` script
   - Execute `npm run dev` (or `npm start` if `dev` is not available)

2. **Static website**
   - Look for `.html` files in the workspace (especially `index.html`)
   - Execute `python3 -m http.server 8000` to serve static files

## Workflow

```bash
# Step 1: Check if this is a Node.js project
if [ -f "package.json" ]; then
    # Check for dev script
    if grep -q '"dev"' package.json; then
        npm run dev
    elif grep -q '"start"' package.json; then
        npm start
    fi
# Step 2: Check for static HTML files
elif [ -f "index.html" ] || ls *.html 1> /dev/null 2>&1; then
    python3 -m http.server 8000
fi
```

## Notes

- The server will run in the background or as a subagent task
- Default port for static server is 8000
- For Node.js projects, the port depends on the project configuration
- Make sure dependencies are installed (`npm install`) before running Node.js projects
