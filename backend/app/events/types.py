class LogLevel:  # severity constants used as the ``level`` field in every log write
    INFO = "INFO"   # routine informational entry; operation completed normally
    WARN = "WARN"   # unexpected but non-fatal condition; something may need attention
    ERROR = "ERROR" # operation failed; an exception or error state occurred


class UserEvent:  # event-type slug constants for user lifecycle log entries
    INIT       = "user.init"       # user record created in Postgres for the first time
    UPDATE     = "user.update"     # user profile, role, or theme preference changed
    DELETE     = "user.delete"     # user account permanently removed
    ACTIVATE   = "user.activate"   # account re-enabled after being deactivated
    DEACTIVATE = "user.deactivate" # account disabled by an admin
    LOGIN      = "user.login"      # successful password authentication
    NOT_FOUND  = "user.not_found"  # lookup by email returned no matching row
    ERROR      = "user.error"      # unexpected exception in user-handling code


class ModuleEvent:  # event-type slug constants for module lifecycle log entries
    INIT       = "module.init"       # module registered in the modules table for the first time
    UPDATE     = "module.update"     # module configuration (name, URL, presets) changed
    DELETE     = "module.delete"     # module unregistered and removed from the table
    ACTIVATE   = "module.activate"   # module enabled flag set to True; now visible in the sidebar
    DEACTIVATE = "module.deactivate" # module enabled flag set to False; hidden from non-admins
    NOT_FOUND  = "module.not_found"  # lookup by ID or scope returned no matching row
    ERROR      = "module.error"      # unexpected exception in module-handling code
    INFO       = "module.info"       # generic informational entry; caller supplies the message directly


class PageEvent:  # event-type slug constants for page registry log entries
    INIT   = "page.init"   # page route first seeded into page_registry
    UPDATE = "page.update" # page config (title, roles, skeleton, enabled) updated by an admin


class BotEvent:  # event-type slug constants for bot lifecycle log entries
    INIT       = "bot.init"       # bot row first created and persisted to Postgres
    UPDATE     = "bot.update"     # bot configuration (model, provider, prompt) updated
    DELETE     = "bot.delete"     # bot permanently removed from the bots table
    ACTIVATE   = "bot.activate"   # bot active flag set to True; visible to non-admin users
    DEACTIVATE = "bot.deactivate" # bot active flag set to False; hidden from non-admins
    NOT_FOUND  = "bot.not_found"  # lookup by ID returned no matching row
    ERROR      = "bot.error"      # unexpected exception in bot-handling code
    INFO       = "bot.info"       # generic informational log entry; caller supplies the message
    ABORT      = "bot.abort"      # client closed the SSE stream before the model finished responding
