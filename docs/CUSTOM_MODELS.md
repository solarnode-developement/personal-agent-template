# Custom AI Models with Eve

This guide explains how to use custom OpenAI-compatible models (like Deepseek via Pollinations) with Eve.

## Current Limitation & Workaround

Eve v0.13.8 requires all models to be registered in the Vercel AI Gateway for metadata (context window, max tokens, costs). Custom models with private endpoints aren't in the gateway, which prevents Eve compilation.

### Current Solution (Workaround)

Use a known model ID (like `gpt-4-turbo`) for Eve's compilation, but route requests to your custom endpoint:

```typescript
// agent/agent.ts
const customOpenAI = createOpenAI({
  baseURL: "https://gen.pollinations.ai/v1", // Custom endpoint
  apiKey: process.env.OPENAI_API_KEY,
});

// Use model ID Eve recognizes, endpoint provides Deepseek
const model = customOpenAI.languageModel("gpt-4-turbo");

export default defineAgent({ model });
```

This works because:
- **Eve compilation**: Uses `gpt-4-turbo` metadata (context window, costs, limits)
- **Runtime**: Requests actually go to Pollinations → Deepseek V4
- **Token counts**: gpt-4-turbo (~128K) ≈ Deepseek (~128K), so metadata is compatible

### Complete Custom Model Support (Future)

When Eve gains support for custom model metadata, use these utilities:

## Utilities for Future Custom Model Support

We've prepared utilities in `agent/lib/custom-model.ts` and `agent/lib/eve-metadata.ts` for when Eve supports custom models. These provide:

- `registerCustomModel(modelId, metadata)` - Register metadata globally
- `validateCustomMetadata(modelId, metadata)` - Validate required fields
- `attachModelMetadata(model, metadata)` - Attach metadata to model objects
- `patchAISDKModels()` - Make metadata discoverable to Eve

### Using Custom Model Utilities (When Eve Adds Support)

Once Eve v0.14+ adds custom model support:

```typescript
import { registerCustomModel, attachModelMetadata } from "./lib/custom-model";

const metadata = {
  contextWindow: 128000,
  maxOutputTokens: 8000,
  costPerMillionInputTokens: 0.14,
  costPerMillionOutputTokens: 0.28,
};

registerCustomModel("deepseek", metadata);

const model = attachModelMetadata(
  customOpenAI.languageModel("deepseek"),
  metadata
);

export default defineAgent({ model });
```

## Changing Your Model

### Switch to a Different Custom Endpoint

Edit `agent/agent.ts`:

```typescript
const customOpenAI = createOpenAI({
  baseURL: "https://your-endpoint.com/v1",
  apiKey: process.env.YOUR_API_KEY,
});

const model = customOpenAI.languageModel("gpt-4-turbo");
```

### Use Your Own Credentials

Requires these environment variables set (locally or on Vercel):

- `OPENAI_API_KEY` - API key for your custom endpoint

## Metadata Compatibility

The workaround maps known model IDs to custom endpoints. Compatibility requirements:

| Proxy Model | Custom Model | Requirement |
|---|---|---|
| `gpt-4-turbo` | Deepseek V4 | Both have ~128K context windows |
| `claude-opus` | Other 200K model | Both need 200K+ context |
| `gpt-4` | 8K model | Both have 8K context |

Choose a proxy model whose token limits match your actual model.

## Future: Full Custom Model Support

When Eve supports custom models directly, this will work:

```typescript
// Will be possible once Eve adds support for custom model metadata
const model = customOpenAI.languageModel("deepseek");
// Eve will use supplied metadata instead of checking AI Gateway
```

See `agent/lib/custom-model.ts` for the implementation framework ready for this upgrade.

## See Also

- `agent/agent.ts` - Current agent configuration with Pollinations custom endpoint
- `agent/lib/custom-model.ts` - Custom model utilities (prepared for future use)
- `agent/lib/eve-metadata.ts` - Eve metadata integration layer
- `docs/CUSTOMIZATION.md` - General agent customization guide
