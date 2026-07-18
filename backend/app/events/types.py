class LogLevel:  # severity constants used as the ``level`` field in every log write
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"


class UserEvent:  # event-type slug constants for user lifecycle log entries
    INIT       = "user.init"
    UPDATE     = "user.update"
    DELETE     = "user.delete"
    ACTIVATE   = "user.activate"
    DEACTIVATE = "user.deactivate"
    LOGIN      = "user.login"
    NOT_FOUND  = "user.not_found"
    ERROR      = "user.error"


class ModuleEvent:  # event-type slug constants for module lifecycle log entries
    INIT       = "module.init"
    UPDATE     = "module.update"
    DELETE     = "module.delete"
    ACTIVATE   = "module.activate"
    DEACTIVATE = "module.deactivate"
    NOT_FOUND  = "module.not_found"
    ERROR      = "module.error"
    INFO       = "module.info"


class ComponentEvent:  # event-type slug constants for UI component log entries
    INIT   = "component.init"
    UPDATE = "component.update"
    DELETE = "component.delete"


class PageEvent:  # event-type slug constants for page registry log entries
    INIT   = "page.init"
    UPDATE = "page.update"


class BotEvent:  # event-type slug constants for bot lifecycle log entries
    INIT       = "bot.init"
    UPDATE     = "bot.update"
    DELETE     = "bot.delete"
    ACTIVATE   = "bot.activate"
    DEACTIVATE = "bot.deactivate"
    NOT_FOUND  = "bot.not_found"
    ERROR      = "bot.error"
    INFO       = "bot.info"
    ABORT      = "bot.abort"
