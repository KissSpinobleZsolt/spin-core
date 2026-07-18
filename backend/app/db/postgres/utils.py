def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base, returning a new dict with override values preferred."""
    result = dict(base)
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result
