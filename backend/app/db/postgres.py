from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import sessionmaker, declarative_base

from app.db.interface import UserRecord

Base = declarative_base()


class UserRow(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    roles = Column(ARRAY(String), nullable=False, default=list)
    default_theme = Column(String, nullable=False, default="dark")


class PageRow(Base):
    __tablename__ = "page_responses"
    id = Column(Integer, primary_key=True, index=True)
    page_key = Column(String, unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False)


class PostgresAdapter:
    def __init__(self, db_url: str) -> None:
        self._engine = create_engine(db_url)
        self._Session = sessionmaker(autocommit=False, autoflush=False, bind=self._engine)
        Base.metadata.create_all(bind=self._engine)

    def test_connection(self) -> None:
        with self._engine.connect():
            pass

    def _session(self):
        return self._Session()

    def get_user_by_email(self, email: str) -> UserRecord | None:
        db = self._session()
        try:
            row = db.query(UserRow).filter(UserRow.email == email).first()
            if not row:
                return None
            return UserRecord(
                email=row.email,
                name=row.name,
                hashed_password=row.hashed_password,
                roles=list(row.roles),
                default_theme=row.default_theme,
            )
        finally:
            db.close()

    def create_user(
        self,
        email: str,
        name: str,
        hashed_password: str,
        roles: list[str],
        default_theme: str,
    ) -> UserRecord:
        db = self._session()
        try:
            row = UserRow(
                email=email,
                name=name,
                hashed_password=hashed_password,
                roles=roles,
                default_theme=default_theme,
            )
            db.add(row)
            db.commit()
            return UserRecord(email=email, name=name, hashed_password=hashed_password, roles=roles, default_theme=default_theme)
        finally:
            db.close()

    def update_user_theme(self, email: str, theme: str) -> None:
        db = self._session()
        try:
            row = db.query(UserRow).filter(UserRow.email == email).first()
            if row:
                row.default_theme = theme
                db.commit()
        finally:
            db.close()

    def get_page(self, key: str) -> str | None:
        db = self._session()
        try:
            row = db.query(PageRow).filter(PageRow.page_key == key).first()
            return row.content if row else None
        finally:
            db.close()

    def upsert_page(self, key: str, content: str) -> None:
        db = self._session()
        try:
            row = db.query(PageRow).filter(PageRow.page_key == key).first()
            if row:
                row.content = content
            else:
                db.add(PageRow(page_key=key, content=content))
            db.commit()
        finally:
            db.close()
