from datetime import datetime, timezone


def _month_start() -> datetime:  # returns the UTC start of the current month; used as the default lower time bound for queries
    now = datetime.now(timezone.utc)  # current UTC timestamp
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)  # truncate to midnight on the first day of the current month
