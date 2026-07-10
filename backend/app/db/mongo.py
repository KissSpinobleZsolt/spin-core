from bson import ObjectId
from pymongo import MongoClient

_I18N_MODULE = "system"
_I18N_COLLECTION = "i18n"


class MongoDataAdapter:
    def __init__(self, db_url: str) -> None:
        self._client = MongoClient(db_url, serverSelectionTimeoutMS=5000)
        db_name = db_url.split("/")[-1].split("?")[0]
        self._db = self._client[db_name]

    def test_connection(self) -> None:
        self._client.admin.command("ping")

    def _col(self, module_id: str, collection: str):
        return self._db[f"{module_id}__{collection}"]

    # i18n helpers — stored in system__i18n collection
    def get_i18n_data(self, lang: str) -> dict | None:
        doc = self._col(_I18N_MODULE, _I18N_COLLECTION).find_one({"lang": lang})
        return doc.get("data") if doc else None

    def set_i18n_data(self, lang: str, data: dict) -> None:
        self._col(_I18N_MODULE, _I18N_COLLECTION).update_one(
            {"lang": lang}, {"$set": {"lang": lang, "data": data}}, upsert=True
        )

    def get_documents(
        self,
        module_id: str,
        collection: str,
        filter_dict: dict,
        limit: int = 50,
        skip: int = 0,
    ) -> list[dict]:
        cursor = self._col(module_id, collection).find(filter_dict).skip(skip).limit(limit)
        return [_serialise(doc) for doc in cursor]

    def insert_document(self, module_id: str, collection: str, doc: dict) -> str:
        result = self._col(module_id, collection).insert_one(doc)
        return str(result.inserted_id)

    def update_document(self, module_id: str, collection: str, doc_id: str, update: dict) -> bool:
        result = self._col(module_id, collection).update_one(
            {"_id": ObjectId(doc_id)}, {"$set": update}
        )
        return result.matched_count > 0

    def delete_document(self, module_id: str, collection: str, doc_id: str) -> bool:
        result = self._col(module_id, collection).delete_one({"_id": ObjectId(doc_id)})
        return result.deleted_count > 0


def _serialise(doc: dict) -> dict:
    out = dict(doc)
    if "_id" in out:
        out["_id"] = str(out["_id"])
    return out
