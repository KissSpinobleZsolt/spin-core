def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base, returning a new dict with override values preferred."""
    result = dict(base)  # shallow copy of base so the original is not mutated
    for key, value in override.items():  # iterate every key in the override dict
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)  # both sides are dicts; recurse to merge nested levels
        else:
            result[key] = value  # override wins for scalars, lists, and type mismatches
    return result  # return the merged dict to the caller
