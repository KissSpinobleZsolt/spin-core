# WebSocket Notifications Flow

The notifications WebSocket authenticates via a JWT query parameter, then polls ClickHouse every 5 seconds for new rows belonging to that user. Defined in `backend/app/routes/notifications/router.py`.

```mermaid
sequenceDiagram
    participant C as Client (Browser)
    participant WS as notifications/router
    participant CH as ClickHouse notifications table

    C->>WS: WS /api/notifications/ws?token=jwt
    WS->>WS: decode_token(token) → owner email
    alt invalid token
        WS-->>C: close(code=1008 Policy Violation)
    end
    WS->>WS: since = datetime.utcnow()
    loop every 5 seconds
        WS->>CH: query_notifications_since(owner, since)
        CH-->>WS: [NotificationRow, ...]
        alt new rows returned
            WS->>WS: update since = last row event_time
            WS-->>C: JSON array of new notifications
        end
        WS->>WS: asyncio.sleep(5)
    end
    C-->>WS: disconnect
```
