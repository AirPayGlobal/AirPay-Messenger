# MCP Servers Configuration

This project includes MCP (Model Context Protocol) servers to enhance Claude's capabilities when working with this codebase.

## What are MCP Servers?

MCP servers give Claude direct access to external tools and data sources, enabling more powerful workflows:
- Direct database queries (PostgreSQL)
- File system operations
- GitHub integration
- Web searching and fetching
- AWS services access
- Memory and sequential thinking

## Configured MCP Servers

### 1. **Filesystem Server**
**Status:** ✅ Active
**Purpose:** Read/write access to project files
**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
}
```

**What it does:**
- List files and directories
- Read file contents
- Search for files
- Create/edit/delete files
- Navigate the project structure

**Use cases:**
- Code exploration and understanding
- File manipulation
- Project structure analysis

---

### 2. **PostgreSQL Server**
**Status:** ⚠️ Requires DATABASE_URL
**Purpose:** Direct database queries and schema inspection
**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres", "${DATABASE_URL}"]
}
```

**What it does:**
- Execute SQL queries
- Inspect database schema
- View table structures
- Query data directly
- Analyze relationships

**Setup:**
1. Set `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/airpay_messenger"
   ```
2. Ensure PostgreSQL is running
3. Run migrations: `npm run prisma:migrate`

**Use cases:**
- Debugging database issues
- Data analysis
- Schema exploration
- Query optimization

---

### 3. **GitHub Server**
**Status:** ⚠️ Requires GITHUB_TOKEN
**Purpose:** GitHub repository access
**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

**What it does:**
- Create/manage issues and PRs
- Search repositories
- Read/write files in repos
- Manage branches
- View commit history

**Setup:**
1. Generate a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo`, `read:org`
   - Copy the token
2. Add to `.env`:
   ```
   GITHUB_TOKEN=ghp_xxxxxxxxxxxx
   ```

**Use cases:**
- Code reviews
- Issue tracking
- Repository management
- Documentation updates

---

### 4. **AWS KB Retrieval Server**
**Status:** ⚠️ Requires AWS credentials
**Purpose:** AWS Knowledge Base retrieval
**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-aws-kb-retrieval"],
  "env": {
    "AWS_ACCESS_KEY_ID": "${AWS_ACCESS_KEY_ID}",
    "AWS_SECRET_ACCESS_KEY": "${AWS_SECRET_ACCESS_KEY}",
    "AWS_REGION": "${AWS_REGION}"
  }
}
```

**What it does:**
- Query AWS service documentation
- Retrieve AWS best practices
- Access AWS knowledge bases

**Use cases:**
- AWS service configuration help
- Best practices lookup
- Troubleshooting AWS issues

---

### 5. **Brave Search Server**
**Status:** ⚠️ Requires BRAVE_API_KEY (Optional)
**Purpose:** Web search capabilities
**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": {
    "BRAVE_API_KEY": "${BRAVE_API_KEY}"
  }
}
```

**What it does:**
- Search the web
- Find latest documentation
- Look up error messages
- Research technologies

**Setup:**
1. Get a Brave Search API key from https://brave.com/search/api/
2. Add to `.env`:
   ```
   BRAVE_API_KEY=your-api-key
   ```

**Use cases:**
- Finding documentation
- Researching errors
- Technology lookups

---

### 6. **Fetch Server**
**Status:** ✅ Active
**Purpose:** Fetch web resources
**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-fetch"]
}
```

**What it does:**
- Fetch URLs
- Download web content
- Access API documentation
- Retrieve external resources

**Use cases:**
- Reading API docs
- Fetching external data
- Accessing web resources

---

### 7. **Memory Server**
**Status:** ✅ Active
**Purpose:** Persistent context across sessions
**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"]
}
```

**What it does:**
- Remember information across conversations
- Store project-specific knowledge
- Maintain context

**Use cases:**
- Remembering project conventions
- Storing user preferences
- Maintaining project context

---

### 8. **Sequential Thinking Server**
**Status:** ✅ Active
**Purpose:** Enhanced reasoning capabilities
**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
}
```

**What it does:**
- Extended thinking for complex problems
- Multi-step reasoning
- Detailed analysis

**Use cases:**
- Complex debugging
- Architecture decisions
- Code review analysis

---

## How to Enable/Disable MCP Servers

MCP servers are configured in `.claude/settings.json`. They activate automatically when Claude Code starts.

### To Disable a Server:
1. Open `.claude/settings.json`
2. Add `"disabled": true` to the server config:
   ```json
   "postgres": {
     "command": "npx",
     "args": ["..."],
     "disabled": true
   }
   ```

### To Enable a Server:
1. Ensure required environment variables are set in `.env`
2. Remove `"disabled": true` from the config (or set to `false`)
3. Restart Claude Code

---

## Environment Variables Reference

Add these to your `.env` file:

```bash
# Required for PostgreSQL MCP Server
DATABASE_URL="postgresql://user:password@localhost:5432/airpay_messenger?schema=public"

# Required for GitHub MCP Server
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Required for AWS MCP Servers (already in .env for the app)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Optional: Brave Search API
BRAVE_API_KEY=your-brave-api-key
```

---

## Testing MCP Servers

### 1. Check if servers are running:
- Open Claude Code
- Look for MCP server indicators in the status bar
- Check for connection messages in the output panel

### 2. Test Filesystem Server:
Ask Claude: "List all TypeScript files in the src/ directory"

### 3. Test PostgreSQL Server:
Ask Claude: "Show me the schema for the messages table"

### 4. Test GitHub Server:
Ask Claude: "Create a GitHub issue for this project"

### 5. Test Fetch Server:
Ask Claude: "Fetch the latest Express.js documentation"

---

## Troubleshooting

### MCP Server Not Connecting

**Problem:** Server shows as disconnected
**Solutions:**
1. Check environment variables are set in `.env`
2. Ensure the MCP server package is accessible via `npx`
3. Restart Claude Code
4. Check the Claude Code output panel for errors

### PostgreSQL Server Fails

**Problem:** Can't connect to database
**Solutions:**
1. Verify PostgreSQL is running: `psql --version`
2. Check `DATABASE_URL` format in `.env`
3. Test connection manually: `psql $DATABASE_URL -c "SELECT 1"`
4. Ensure database exists and migrations are run

### GitHub Server Authentication Issues

**Problem:** GitHub token invalid
**Solutions:**
1. Generate a new Personal Access Token
2. Ensure token has `repo` and `read:org` scopes
3. Check token is correctly set in `.env`
4. Token format should be: `ghp_...` (classic token)

### npx Package Not Found

**Problem:** `@modelcontextprotocol/server-*` not found
**Solutions:**
1. Ensure you have internet connection
2. Clear npm cache: `npm cache clean --force`
3. Update npm: `npm install -g npm@latest`
4. Manually install: `npx -y @modelcontextprotocol/server-filesystem`

---

## Security Considerations

⚠️ **Never commit `.env` file to version control!**

- `.env` is in `.gitignore` by default
- MCP servers have access to your credentials
- Only enable servers you actively need
- Use environment variables for all secrets
- Rotate tokens regularly
- Use minimal permission scopes

---

## Advanced Configuration

### Custom Server Locations

Edit `.claude/settings.json` to add custom MCP servers:

```json
{
  "mcpServers": {
    "my-custom-server": {
      "command": "node",
      "args": ["/path/to/custom-server.js"],
      "env": {
        "CUSTOM_VAR": "value"
      }
    }
  }
}
```

### Global vs Project-Level Configuration

- **Project-level:** `.claude/settings.json` (this file)
  - Specific to this project
  - Shared with team (commit to git)
  - Project-specific paths and settings

- **User-level:** `~/.claude/settings.json`
  - Global across all projects
  - Personal configuration
  - Not shared with team

---

## Additional MCP Servers (Community)

---

### 9. **Anthropic (Claude) Server**
**Status:** ⚠️ Requires ANTHROPIC_API_KEY
**Purpose:** Connect to Anthropic Claude models for generation and assistance
**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-anthropic"],
  "env": {
    "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
    "ANTHROPIC_API_URL": "${ANTHROPIC_API_URL}"
  }
}
```

**What it does:**
- Send prompts to Anthropic Claude models
- Retrieve completions/responses for assistants and helpers

**Setup:**
1. Add to your `.env` (see examples in this repo's `.env.example`):
   ```bash
   ENABLE_ANTHROPIC=true
   ANTHROPIC_API_KEY=sk-xxxx
   ANTHROPIC_API_URL=https://api.anthropic.com
   ANTHROPIC_MODEL=claude-3-mini
   ```
2. Restart Claude Code / your MCP server host

**Use cases:**
- Generating content for notifications or templates
- Assistive code or documentation generation inside Claude Code


These aren't configured by default but can be added:

### Redis Server
```json
"redis": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-redis"],
  "env": {
    "REDIS_URL": "redis://localhost:6379"
  }
}
```

### Docker Server
```json
"docker": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-docker"]
}
```

### Slack Server
```json
"slack": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-slack"],
  "env": {
    "SLACK_BOT_TOKEN": "xoxb-..."
  }
}
```

---

## References

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Anthropic MCP Servers](https://github.com/modelcontextprotocol)
- [Claude Code Documentation](https://docs.anthropic.com/)
- [MCP Server Registry](https://github.com/modelcontextprotocol/servers)

---

## Quick Reference

| Server | Status | Requires | Purpose |
|--------|--------|----------|---------|
| Filesystem | ✅ Active | None | File operations |
| PostgreSQL | ⚠️ Setup | DATABASE_URL | Database queries |
| GitHub | ⚠️ Setup | GITHUB_TOKEN | Repo management |
| AWS KB | ⚠️ Setup | AWS Creds | AWS knowledge |
| Brave Search | ⚠️ Optional | API Key | Web search |
| Fetch | ✅ Active | None | URL fetching |
| Memory | ✅ Active | None | Context retention |
| Sequential | ✅ Active | None | Enhanced reasoning |

**Next Steps:**
1. Set required environment variables in `.env`
2. Restart Claude Code to activate servers
3. Test each server with sample commands
4. Explore the capabilities in your workflow!
