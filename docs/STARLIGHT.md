# Starlight Credit System

Starlight is Sonas's currency system. Every AI model invocation consumes Starlight credits based on token usage and model cost.

## How It Works

1. **Free users receive 5 Starlight weekly** - Resets every 7 days
2. **Credits are consumed per token** - Based on model and usage
3. **Different models cost different amounts** - Faster/smarter models cost more
4. **Track all usage** - See which models and features consume credits
5. **Upgrade for more credits** - Premium plans get unlimited or higher allowances

## Credit Costs by Model

### Deepseek V4 (Current Default)
- ~3 Starlight per 1,000,000 combined tokens
- Example: 10K input + 5K output = 45 Starlight
- Fastest + most affordable reasoning model

### GPT-4 Turbo
- ~2 Starlight per 1,000,000 combined tokens  
- Good balance of speed and cost
- Better for complex reasoning

### Claude 3 Opus
- ~25 Starlight per 1,000,000 combined tokens
- Most capable but expensive
- For advanced tasks only

## Cost Calculation

```
Starlight Cost = (Input Tokens + Output Tokens) × Model Cost Per Million / 1,000,000
Minimum: 1 Starlight per request (to prevent 0-cost queries)
```

**Example - Deepseek V4:**
- Input: 5,000 tokens
- Output: 2,000 tokens
- Total: 7,000 tokens
- Cost: (7,000 / 1,000,000) × 3 = ~0.021 Starlight → **1 Starlight minimum**

**Example - GPT-4 Turbo:**
- Input: 50,000 tokens
- Output: 10,000 tokens  
- Total: 60,000 tokens
- Cost: (60,000 / 1,000,000) × 2 = **0.12 Starlight → 1 Starlight minimum**

**Example - Complex Reasoning (Deepseek):**
- Input: 100,000 tokens (full context)
- Output: 50,000 tokens (detailed response)
- Total: 150,000 tokens
- Cost: (150,000 / 1,000,000) × 3 = **0.45 → 1 Starlight (or higher if rounding)**

## Weekly Allowance

Free users receive:
- **5 Starlight per week** - Auto-reset every 7 days
- Resets on your signup date anniversary
- Unused credits don't roll over (use it or lose it)
- No charges for unused credits

### Checking Your Balance

Visit the credits page to see:
- Current balance
- Total earned (all-time)
- Total spent (all-time)
- Weekly allowance remaining
- Recent usage by model

Or query via API:
```bash
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  https://sonas.vercel.app/api/starlight/credits
```

## Roblox Tools Credit Costs

Using Roblox tools in Sonas consumes credits based on:
- Agent reasoning about the action (reading/analyzing your game code)
- Planning multiple actions
- Error recovery and retries

Typical costs:
- **Simple read/write**: 1-2 Starlight (minimal reasoning)
- **Complex script refactor**: 5-10 Starlight (extensive analysis)
- **Large-scale changes**: 10-20+ Starlight (many actions)

## Purchasing More Credits

Premium plans available:
- **Pro**: 100 Starlight/month
- **Studio**: 500 Starlight/month  
- **Enterprise**: Custom allowance

Coming soon: one-time credit purchases for specific projects.

## Error Messages

**"Insufficient Starlight credits"**
- You don't have enough credits for this request
- Wait for weekly reset
- Upgrade to a paid plan
- Reduce scope of request

**"Unknown model"**
- Model not available or not configured
- Check model ID spelling
- Use default Deepseek or another available model

## Implementation Details

### Database Tables

- `starlight_credits` - User balance, total earned/spent
- `starlight_usage` - Individual transaction log
- `starlight_allowance` - Weekly limit tracking  
- `model_pricing` - Cost configuration per model

### Weekly Reset Logic

Every user has a `next_reset_date`. When:
- User makes a request after reset date
- System detects the reset
- Adds 5 Starlight back to balance
- Updates reset date to +7 days

### Cost Configuration

Model pricing stored in `model_pricing` table:
```sql
modelId: "deepseek"
inputCostPer1mTokens: 14 (cents)
outputCostPer1mTokens: 28 (cents)
starlightPerMCombinedTokens: 3
```

The `starlightPerMCombinedTokens` field is the primary rate.

## API Reference

### Get Credits
```http
GET /api/starlight/credits
Authorization: Bearer <token>
```

Returns:
```json
{
  "balance": 5,
  "totalEarned": 10,
  "totalSpent": 5,
  "weekly": {
    "allowance": 5,
    "used": 3,
    "remaining": 2,
    "nextResetDate": "2024-07-11T14:32:00Z"
  },
  "recentUsage": [
    {
      "model": "deepseek",
      "tokens": 7000,
      "spent": 1,
      "context": "roblox-script-analysis",
      "createdAt": "2024-07-04T14:32:00Z"
    }
  ]
}
```

### Log Usage
(Internal API - called automatically by agent)
```http
POST /api/internal/starlight/log-usage
Authorization: Bearer <INTERNAL_API_SECRET>

{
  "userId": "user-id",
  "model": "deepseek",
  "inputTokens": 5000,
  "outputTokens": 2000,
  "context": "roblox-script-analysis"
}
```

## See Also

- [ROBLOX_INTEGRATION.md](./ROBLOX_INTEGRATION.md) - Roblox tools credit usage
- `server/db/schema/starlight.ts` - Database schema
- `server/utils/starlight.ts` - Credit calculation and management
