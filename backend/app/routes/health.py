from fastapi import APIRouter

from app.database import get_pg, get_ch, get_mongo

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
async def health():
    result = {"api": True, "postgres": False, "clickhouse": False, "mongo": False}

    try:
        get_pg().test_connection()
        result["postgres"] = True
    except Exception:
        pass

    try:
        get_ch().test_connection()
        result["clickhouse"] = True
    except Exception:
        pass

    try:
        get_mongo().test_connection()
        result["mongo"] = True
    except Exception:
        pass

    return result
