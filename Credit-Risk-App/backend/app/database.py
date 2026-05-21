from pymongo import MongoClient
from pymongo.database import Database

from app.config import get_settings

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = get_settings().mongo_uri.strip()
        if not uri or "YOUR_" in uri:
            raise RuntimeError(
                "Set MONGO_URI in .env to your MongoDB Atlas connection string "
                "(mongodb+srv://user:pass@cluster.mongodb.net/...)"
            )
        _client = MongoClient(uri, serverSelectionTimeoutMS=15000)
    return _client


def get_db() -> Database:
    settings = get_settings()
    return get_client()[settings.mongo_db_name]


def get_users_collection():
    return get_db()["users"]


def get_predictions_collection():
    return get_db()["predictions"]


def get_profiles_collection():
    return get_db()["profiles"]
