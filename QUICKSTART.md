# Sonas Quickstart Guide

Get up and running with Sonas in 5 minutes.

## Prerequisites

- Node.js 18+
- A Supabase project (already configured)
- Roblox Studio installed (optional, for game development)

## Installation

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm run db:push

# Start development server
pnpm dev
```

Visit `http://localhost:3000` and sign up for an account.

## Using Starlight Credits

Every user gets **5 Starlight credits per week**.

**Check your balance:**
```bash
curl -H "Cookie: sb-access-token=$YOUR_TOKEN" \
  http://localhost:3000/api/starlight/credits
```

**View current pricing:**
- Deepseek V4: 3 per 1M tokens
- GPT-4 Turbo: 2 per 1M tokens  
- Claude 3: 25 per 1M tokens

## Using Roblox Tools

### 1. Install the Plugin

1. Copy `roblox-plugin/sonas-plugin.lua`
2. Open Roblox Studio with your game
3. Paste the code into a Script in ServerScriptService
4. Modify `USER_ID` and `API_BASE` in the config
5. Run the script - plugin is now active

### 2. Ask Sonas to Modify Your Game

```
Chat: "Read the spawn script"
→ Agent reads ServerScriptService/Spawn script via plugin

Chat: "Create a green brick at (0, 5, 0)"
→ Agent creates Part with green color at position

Chat: "Find all scripts that contain 'OnTouched'"
→ Agent searches all scripts and returns matches
```

### 3. Available Commands

**Scripts:**
- `Read a script` - Get source code
- `Edit line 5 to 10` - Replace lines in script
- `Create a script` - Make new LocalScript or ModuleScript
- `Search for "function OnTouched"` - Find pattern in scripts

**Instances:**
- `Create a part in Workspace` - Make new instance
- `Delete the spawn platform` - Remove instance
- `Set the part's color to red` - Modify properties
- `Find all parts named "obstacle"` - Search instances

## Project Structure

```
agent/
  ├── agent.ts              # Main agent definition
  ├── channels/             # Different platforms (web, Slack, etc)
  ├── tools/                # Agent tools
  │   ├── roblox_scripts.ts # Script manipulation
  │   ├── roblox_instances.ts # Instance management
  │   └── ...
  └── lib/
      ├── roblox-internal.ts # Roblox API functions
      └── ...

server/
  ├── api/
  │   ├── auth/            # Authentication endpoints
  │   ├── starlight/       # Credit system APIs
  │   └── internal/roblox/ # Roblox plugin communication
  └── db/
      ├── schema/          # Database schemas
      │   ├── roblox.ts    # Roblox tables
      │   └── starlight.ts # Credit tables
      └── ...

docs/
  ├── ROBLOX_INTEGRATION.md  # Full Roblox guide
  ├── STARLIGHT.md           # Credit system docs
  └── IMPLEMENTATION_SUMMARY.md # This project's features
```

## Common Tasks

### Deploy to Vercel

```bash
git push origin main
# Vercel automatically deploys
```

### Add a New Model to Pricing

```typescript
// server/db/schema/starlight.ts
// Add to modelPricing insert in initializePricing()
{
  modelId: "gpt-4",
  modelName: "GPT-4",
  inputCostPer1mTokens: 30,
  outputCostPer1mTokens: 60,
  starlightPerMCombinedTokens: 5,
}
```

### Check Roblox Plugin Logs

Plugin logs appear in:
- Roblox Studio > Output window
- Browser console (dev tools) if plugin posts back

### Debug Roblox Requests

Check database:
```sql
SELECT * FROM roblox_requests WHERE status != 'completed' ORDER BY created_at DESC;
SELECT * FROM roblox_connections ORDER BY last_heartbeat DESC;
```

## Troubleshooting

### "Insufficient Starlight credits"
- Wait for weekly reset (7 days after signup)
- Sign up for a paid plan (coming soon)
- Reduce scope of your request

### Roblox Plugin Not Connecting
- Check USER_ID is set correctly in plugin
- Check API_BASE points to correct server
- Try `button.Click:Connect(...)` in plugin to see status
- Check Studio can reach your server (firewall?)

### Script Not Found Error
- Use correct path format: "ServerScriptService/MyScript"
- Try search tool to find exact name
- Check capitalization

### Database Error on Signup
- Run `pnpm run db:push` to ensure all tables exist
- Check Supabase connection string
- Verify `INTERNAL_API_SECRET` is set

## Next Steps

1. **Read the full docs:**
   - `docs/ROBLOX_INTEGRATION.md` - Complete Roblox setup
   - `docs/STARLIGHT.md` - Credit system details
   - `docs/IMPLEMENTATION_SUMMARY.md` - Full feature overview

2. **Set up your Roblox game:**
   - Install plugin in Studio
   - Configure auth token
   - Start asking Sonas to build

3. **Monitor usage:**
   - Check `/api/starlight/credits` regularly
   - Track token usage by model
   - Plan premium upgrade if needed

## Support

For issues or questions:
1. Check the documentation files
2. Review error messages in console
3. Check database logs for failures
4. Open an issue on GitHub

## Credits

Built with:
- [Nuxt 4](https://nuxt.com)
- [Eve AI Agent](https://vercel.com/eve)
- [Supabase](https://supabase.com)
- [Drizzle ORM](https://orm.drizzle.team)

Sonas is ready to power your game development with AI!
