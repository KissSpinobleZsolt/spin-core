# Module Registration & i18n Merge Flow

What happens when an admin registers a new module, and how translations are deep-merged without overwriting user edits. Defined in `backend/app/routes/settings/router.py` and `backend/app/db/postgres/adapter.py`.

```mermaid
flowchart TD
    ADM["Admin: POST /api/settings/modules\n{name, remote_url, scope, ...}"] --> PROBE
    PROBE["httpx GET remote_url/manifest.json\n(5s timeout)"] --> PARSE
    PARSE["Parse manifest:\n  i18n key presets\n  bot definitions\n  scope / component"] --> UPSERT
    UPSERT["pg.upsert_module()"] --> SEED_BOTS
    SEED_BOTS["pg.seed_bots_for_module(scope, manifest.bots)\n  only inserts bots that do not already exist"] --> MERGE_I18N
    MERGE_I18N["pg.merge_i18n_data(manifest.i18n)\n  _deep_merge: existing keys win\n  missing keys are inserted"] --> LOG_CH
    LOG_CH["CH: write module.init to app_logs\nCH: write bot.init for each seeded bot"] --> DONE["201 Created"]

    subgraph Startup["Every startup — translations refresh"]
        S1["Load DEFAULT_TRANSLATIONS\n  {en: EN_DICT, ro: RO_DICT}\nfrom backend/app/i18n_defaults/"]
        S2["pg.merge_i18n_data(defaults)\n  deep_merge: existing user edits are preserved\n  only missing keys are inserted"]
        S1 --> S2
    end
```
