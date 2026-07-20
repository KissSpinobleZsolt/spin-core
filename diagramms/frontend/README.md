# Frontend Diagrams

Architecture and flow diagrams for the `spin-core` React 19 SPA. All diagrams use [Mermaid](https://mermaid.js.org/) syntax and render natively in GitHub and VS Code.

| # | File | What it shows |
|---|------|---------------|
| 01 | [01-overall-architecture.md](01-overall-architecture.md) | Build tooling, provider tree, router, and real-time channels |
| 02 | [02-provider-context-tree.md](02-provider-context-tree.md) | Every context provider — state, source, hook, and dependencies |
| 03 | [03-router-and-guards.md](03-router-and-guards.md) | All routes, AuthGuard, RoleGuard, lazy loading, and DB-driven PageLoader |
| 04 | [04-service-layer.md](04-service-layer.md) | Every service file and the backend endpoints it calls |
| 05 | [05-page-data-flow.md](05-page-data-flow.md) | Per-page: Page → Hook → Service → API endpoint mapping |
| 06 | [06-component-hierarchy.md](06-component-hierarchy.md) | Full React component tree from main.tsx to leaf components |
| 07 | [07-auth-flow.md](07-auth-flow.md) | Login → JWT → localStorage → route guard → logout sequence |
| 08 | [08-chat-streaming-flow.md](08-chat-streaming-flow.md) | useChatStream, ChatBubble, ModuleBotPanel, abort, error paths |
| 09 | [09-module-federation-flow.md](09-module-federation-flow.md) | FederatedPage, Webpack container protocol, presets, plugin proxy |
| 10 | [10-realtime-channels.md](10-realtime-channels.md) | Web Worker (health), SSE (model status), WebSocket (notifications) |
| 11 | [11-theme-system.md](11-theme-system.md) | Zustand theme store, cross-tab sync, server persistence |
| 12 | [12-i18n-system.md](12-i18n-system.md) | i18next boot, server bundles, hot-reload on version change, admin editor |
| 13 | [13-page-loading-system.md](13-page-loading-system.md) | Static routes vs DB-driven PageLoader, PAGE_REGISTRY, skeleton types |
| 14 | [14-state-management.md](14-state-management.md) | Server state (TanStack Query), global context, Zustand, local, URL, localStorage |
| 15 | [15-ui-primitives.md](15-ui-primitives.md) | All UI primitive components with props and usage map |
