import uuid

from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import func

from app.db.interface import UserRecord, BotRecord

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


class BotRow(Base):
    __tablename__ = "bots"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False, default="")
    type = Column(String, nullable=False, default="chatbot")
    model = Column(String, nullable=False, default="")
    system_prompt = Column(Text, nullable=False, default="")
    icon = Column(String, nullable=False, default="🤖")
    enabled = Column(Boolean, nullable=False, default=True)
    roles = Column(ARRAY(String), nullable=False, default=list)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


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

    def _bot_row_to_record(self, row: BotRow) -> BotRecord:
        return BotRecord(
            id=row.id,
            name=row.name,
            description=row.description,
            type=row.type,
            model=row.model,
            system_prompt=row.system_prompt,
            icon=row.icon,
            enabled=row.enabled,
            roles=list(row.roles or []),
        )

    def get_bots(self, admin: bool = False, user_roles: list[str] | None = None) -> list[BotRecord]:
        db = self._session()
        try:
            q = db.query(BotRow)
            if not admin:
                q = q.filter(BotRow.enabled == True)
            rows = q.order_by(BotRow.created_at).all()
            if admin:
                return [self._bot_row_to_record(r) for r in rows]
            # Filter by role overlap for non-admins
            result = []
            for r in rows:
                bot_roles = list(r.roles or [])
                if not bot_roles or any(role in bot_roles for role in (user_roles or [])):
                    result.append(self._bot_row_to_record(r))
            return result
        finally:
            db.close()

    def get_bot_by_id(self, bot_id: str) -> BotRecord | None:
        db = self._session()
        try:
            row = db.query(BotRow).filter(BotRow.id == bot_id).first()
            return self._bot_row_to_record(row) if row else None
        finally:
            db.close()

    def create_bot(
        self,
        name: str,
        description: str,
        type: str,
        model: str,
        system_prompt: str,
        icon: str,
        enabled: bool,
        roles: list[str],
    ) -> BotRecord:
        db = self._session()
        try:
            row = BotRow(
                id=str(uuid.uuid4()),
                name=name,
                description=description,
                type=type,
                model=model,
                system_prompt=system_prompt,
                icon=icon,
                enabled=enabled,
                roles=roles,
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            return self._bot_row_to_record(row)
        finally:
            db.close()

    def update_bot(
        self,
        bot_id: str,
        name: str,
        description: str,
        type: str,
        model: str,
        system_prompt: str,
        icon: str,
        enabled: bool,
        roles: list[str],
    ) -> BotRecord | None:
        db = self._session()
        try:
            row = db.query(BotRow).filter(BotRow.id == bot_id).first()
            if not row:
                return None
            row.name = name
            row.description = description
            row.type = type
            row.model = model
            row.system_prompt = system_prompt
            row.icon = icon
            row.enabled = enabled
            row.roles = roles
            db.commit()
            db.refresh(row)
            return self._bot_row_to_record(row)
        finally:
            db.close()

    def delete_bot(self, bot_id: str) -> bool:
        db = self._session()
        try:
            row = db.query(BotRow).filter(BotRow.id == bot_id).first()
            if not row:
                return False
            db.delete(row)
            db.commit()
            return True
        finally:
            db.close()
