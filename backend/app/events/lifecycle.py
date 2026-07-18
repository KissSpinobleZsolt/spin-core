_TEMPLATES: dict[str, str] = {  # maps the last segment of an event_type slug to a human-readable message template
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
    key = event_type.split(".")[-1]  # extract the action segment (e.g. "init" from "bot.init")
    return _TEMPLATES.get(key, "").format(name=name)
