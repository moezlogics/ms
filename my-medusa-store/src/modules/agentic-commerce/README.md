# Agentic Commerce — AI Shopping Assistant

Two features in one module:

1. **Storefront AI chatbot** (`chat_session` + `chat_message` tables) —
   what visitors talk to via the bottom-right chat widget. Powered by
   OpenAI Chat Completions.
2. **OpenAI Agentic Commerce webhook protocol** — HMAC signing /
   verification for when ChatGPT itself acts as a shopping agent.

## Setup

### 1. Add to backend `.env`

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini   # default; tune for cost/quality
AGENTIC_COMMERCE_SIGNATURE_KEY=any-strong-random-string
```

If `OPENAI_API_KEY` is missing the chatbot still works — it returns a
helpful "AI is not configured yet" message so the widget is testable
without keys.

### 2. Run the DB sync

```
node sync-db-complete.js
```

Creates `chat_session` and `chat_message` tables (idempotent).

### 3. Restart the backend

```
cd my-medusa-store && npm run dev
```

The chat widget on the storefront auto-connects via
`/store/chat/session` → `/store/chat/message` and persists conversations
across page navigations using a `visitor_token` in `localStorage`.

## API surface

| Endpoint | Purpose |
|---|---|
| `POST /store/chat/session` | Create or resume a session. Body: `{ visitor_token?, customer_id? }`. Returns `{ session, messages }`. |
| `POST /store/chat/message` | Send a user message and get the assistant reply. Body: `{ session_id, content, page_url? }`. |
| `GET  /store/chat/history?session_id=xxx` | Fetch the full message log. |

## Customizing the assistant

The system prompt is the default friendly e-commerce helper. To
customize, set `systemPrompt` on the module options in
`medusa-config.ts`:

```ts
"agenticCommerce": {
  resolve: "./src/modules/agentic-commerce",
  options: {
    signatureKey: process.env.AGENTIC_COMMERCE_SIGNATURE_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    systemPrompt: "You are a luxury jewellery concierge. Stay formal and concise.",
  },
},
```

## Costs

`gpt-4o-mini` is roughly $0.15 per 1M input tokens and $0.60 per 1M
output tokens. A typical 5-turn chat costs about $0.001. Perfectly
sustainable as a permanent storefront feature.
