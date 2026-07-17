class LogLevel:
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"


class UserEvent:
    INIT       = "user.init"
    UPDATE     = "user.update"
    DELETE     = "user.delete"
    ACTIVATE   = "user.activate"
    DEACTIVATE = "user.deactivate"
    LOGIN      = "user.login"
    NOT_FOUND  = "user.not_found"
    ERROR      = "user.error"


class ModuleEvent:
    INIT       = "module.init"
    UPDATE     = "module.update"
    DELETE     = "module.delete"
    ACTIVATE   = "module.activate"
    DEACTIVATE = "module.deactivate"
    NOT_FOUND  = "module.not_found"
    ERROR      = "module.error"
    INFO       = "module.info"


class ComponentEvent:
    INIT   = "component.init"
    UPDATE = "component.update"
    DELETE = "component.delete"


class PageEvent:
    INIT   = "page.init"
    UPDATE = "page.update"


class BotEvent:
    INIT       = "bot.init"
    UPDATE     = "bot.update"
    DELETE     = "bot.delete"
    ACTIVATE   = "bot.activate"
    DEACTIVATE = "bot.deactivate"
    NOT_FOUND  = "bot.not_found"
    ERROR      = "bot.error"
    INFO       = "bot.info"
    ABORT      = "bot.abort"


_TEMPLATES: dict[str, str] = {
    "init":       "{name} initialized successfully.",
    "update":     "{name} updated successfully.",
    "delete":     "{name} deleted successfully.",
    "activate":   "{name} activated successfully.",
    "deactivate": "{name} deactivated successfully.",
    "not_found":  "{name} not found.",
    "error":      "An error occurred in {name}.",
    "login":      "{name} logged in.",
    "abort":      "{name} stream aborted by user.",
    # info uses the message arg directly — callers pass it as the message kwarg
    "info":       "",
}


def lifecycle_message(event_type: str, name: str) -> str:
    """Return the human-readable message for a lifecycle event type and entity name."""
    key = event_type.split(".")[-1]
    return _TEMPLATES.get(key, "").format(name=name)
