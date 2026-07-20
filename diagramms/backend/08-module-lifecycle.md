# Module Lifecycle State Machine

The full set of states a module can be in, and the transitions driven by admin actions and the background health checker. Defined in `backend/app/routes/settings/router.py` and the `_module_health_checker` task in `main.py`.

```mermaid
stateDiagram-v2
    [*] --> Discovered : manifest.json probed\n(auto-discovery or POST /settings/modules)

    Discovered --> Inactive : inserted with enabled=false\n(auto-discovery path)
    Discovered --> Active : inserted with enabled=true\n(admin adds manually)

    Inactive --> Active : PUT /settings/modules/{id} enabled=true\nwrites module.activate to CH
    Active --> Inactive : PUT /settings/modules/{id} enabled=false\nwrites module.deactivate to CH

    Active --> Offline : health_checker: /manifest.json probe fails\nauto-disables, writes module.deactivate to CH
    Offline --> Active : health_checker: /manifest.json recovers\nauto-enables, writes module.activate to CH

    Active --> [*] : DELETE /settings/modules/{id}\ncascades — remove from bots.modules[]\ndelete orphaned bots\nwrites module.delete to CH
    Inactive --> [*] : DELETE /settings/modules/{id}
```
