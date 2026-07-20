# Chat / Streaming Flow

`useChatStream`, `ChatBubble` (floating widget), and `ModuleBotPanel` (per-module bot).

```mermaid
sequenceDiagram
    participant U as User
    participant CB as ChatBubble / Chat page
    participant UC as useChatStream
    participant API as POST /api/chat
    participant CH as ClickHouse (server-side)

    Note over U,CH: SEND MESSAGE
    U->>CB: type message → press Send
    CB->>UC: sendMessage(text)
    UC->>UC: append user message to local history
    UC->>API: fetch POST /api/chat\n{ messages, bot_id, model, module_id }
    Note over API,CH: server resolves bot → provider → streams NDJSON

    loop NDJSON chunks (application/x-ndjson)
        API-->>UC: { "message": { "content": "..." }, "done": false }
        UC-->>CB: update streaming assistant message
        CB-->>U: live text appears
    end

    API-->>UC: { "done": true, "prompt_tokens": N, "eval_tokens": M }
    UC->>UC: finalise message; save history to localStorage
    API->>CH: write chat.completion to module_logs\nwrite bot.info to bot_logs

    Note over U,CH: ABORT
    U->>CB: press Stop button mid-stream
    CB->>UC: abort()
    UC->>UC: abortController.abort() — kills fetch reader
    UC->>API: POST /api/chat/abort { bot_id, module_id }
    API->>CH: write bot.abort + chat.abort

    Note over U,CH: ERROR
    API-->>UC: { "error": "provider unreachable..." }
    UC-->>CB: show error state
    API->>CH: write bot.error to bot_logs

    subgraph "ChatBubble extras"
        C1["Fetches GET /api/bots (filters modules.includes('system'))"]
        C2["Fetches GET /api/model-status/installed"]
        C3["Bot selector + model selector panel"]
        C4["Gated on Ollama readiness unless cloud bots exist"]
        C5["Persists per-bot chat history in localStorage"]
    end

    subgraph "ModuleBotPanel (inside FederatedPage)"
        M1["Fetches GET /api/bots?module_id="]
        M2["Multi-bot tab selector when bots.length > 1"]
        M3["Violet floating panel bottom-left of the module view"]
        M4["Uses same useChatStream(botId, '', moduleId)"]
    end
```
