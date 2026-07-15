from fastapi import APIRouter

from app.database import get_pg, get_ch

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
async def health():
    """Check connectivity to PostgreSQL and ClickHouse and return a per-service status map."""
    result: dict = {"api": True, "postgres": False, "clickhouse": False, "translations": {}}

    try:
        pg = get_pg()
        pg.test_connection()
        result["postgres"] = True
        result["translations"] = pg.get_i18n_versions()
    except Exception:
        pass

    try:
        get_ch().test_connection()
        result["clickhouse"] = True
    except Exception:
        pass

    return result
