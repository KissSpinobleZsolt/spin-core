import uuid
from contextlib import contextmanager

from sqlalchemy import create_engine, Column, Index, Integer, JSON, String, Text, Boolean, DateTime, text
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


class BotTypeRow(Base):
    __tablename__ = "bot_types"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True)
    icon = Column(String, nullable=False, default="🤖")
    description = Column(String, nullable=False, default="")
    preprompt = Column(Text, nullable=False, default="")
    skills = Column(ARRAY(String), nullable=False, default=list)
    tools = Column(ARRAY(String), nullable=False, default=list)
    output_format = Column(String, nullable=False, default="markdown")
    default_model = Column(String, nullable=False, default="")
    context_strategy = Column(String, nullable=False, default="conversational")


class BotRow(Base):
    __tablename__ = "bots"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False, default="")
    type = Column(String, nullable=False, default="communicator")
    model = Column(String, nullable=False, default="")
    system_prompt = Column(Text, nullable=False, default="")
    icon = Column(String, nullable=False, default="🤖")
    active = Column(Boolean, nullable=False, default=False)
    restricted = Column(String, nullable=False, default="user")
    modules = Column(ARRAY(String), nullable=False, default=list)
    created_by = Column(String, nullable=True, default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TranslationRow(Base):
    __tablename__ = "translations"
    lang = Column(String, primary_key=True)
    data = Column(JSON, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)


class ModuleRow(Base):
    __tablename__ = "modules"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(String, nullable=False, default="")
    remote_url = Column(String, nullable=False)
    scope = Column(String, nullable=False, unique=True)
    component = Column(String, nullable=False)
    route = Column(String, nullable=False)
    icon = Column(String, nullable=False, default="🧩")
    enabled = Column(Boolean, nullable=False, default=True)
    roles = Column(ARRAY(String), nullable=False, default=list)
    presets = Column(JSON, nullable=False, default=dict)


class ModuleDocumentRow(Base):
    __tablename__ = "module_documents"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    module_id = Column(String, nullable=False)
    collection = Column(String, nullable=False)
    data = Column(JSON, nullable=False, default=dict)

    __table_args__ = (
        Index("ix_module_documents_module_collection", "module_id", "collection"),
    )


def _deep_merge(base: dict, override: dict) -> dict:
    result = dict(base)
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


class PostgresAdapter:
    def __init__(self, db_url: str) -> None:
        self._engine = create_engine(db_url)
        self._Session = sessionmaker(autocommit=False, autoflush=False, bind=self._engine)
        Base.metadata.create_all(bind=self._engine)
        self._run_migrations()

    def _run_migrations(self) -> None:
        stmts = [
            "ALTER TABLE translations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now()",
            "ALTER TABLE bots ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE bots ADD COLUMN IF NOT EXISTS restricted VARCHAR NOT NULL DEFAULT 'user'",
            "ALTER TABLE bots ADD COLUMN IF NOT EXISTS modules VARCHAR[] NOT NULL DEFAULT '{}'",
            "ALTER TABLE bots ADD COLUMN IF NOT EXISTS created_by VARCHAR DEFAULT ''",
            "ALTER TABLE bots DROP COLUMN IF EXISTS roles",
        ]
        with self._engine.connect() as conn:
            for stmt in stmts:
                conn.execute(text(stmt))
            conn.commit()

    def test_connection(self) -> None:
        with self._engine.connect():
            pass

    def _session(self):
        return self._Session()

    @contextmanager
    def _session_ctx(self):
        db = self._session()
        try:
            yield db
        finally:
            db.close()

    def get_user_by_email(self, email: str) -> UserRecord | None:
        with self._session_ctx() as db:
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

    def create_user(
        self,
        email: str,
        name: str,
        hashed_password: str,
        roles: list[str],
        default_theme: str,
    ) -> UserRecord:
        with self._session_ctx() as db:
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

    def update_user_theme(self, email: str, theme: str) -> None:
        with self._session_ctx() as db:
            row = db.query(UserRow).filter(UserRow.email == email).first()
            if row:
                row.default_theme = theme
                db.commit()

    def get_page(self, key: str) -> str | None:
        with self._session_ctx() as db:
            row = db.query(PageRow).filter(PageRow.page_key == key).first()
            return row.content if row else None

    def upsert_page(self, key: str, content: str) -> None:
        with self._session_ctx() as db:
            row = db.query(PageRow).filter(PageRow.page_key == key).first()
            if row:
                row.content = content
            else:
                db.add(PageRow(page_key=key, content=content))
            db.commit()

    def _bot_row_to_record(self, row: BotRow) -> BotRecord:
        return BotRecord(
            id=row.id,
            name=row.name,
            description=row.description,
            type=row.type,
            model=row.model,
            system_prompt=row.system_prompt,
            icon=row.icon,
            active=row.active,
            restricted=row.restricted or "user",
            modules=list(row.modules or []),
            created_by=row.created_by or "",
            created_at=row.created_at,
        )

    def _bot_type_row_to_dict(self, row: BotTypeRow) -> dict:
        return {
            "id": row.id,
            "name": row.name,
            "icon": row.icon or "🤖",
            "description": row.description or "",
            "preprompt": row.preprompt or "",
            "skills": list(row.skills or []),
            "tools": list(row.tools or []),
            "output_format": row.output_format or "markdown",
            "default_model": row.default_model or "",
            "context_strategy": row.context_strategy or "conversational",
        }

    def get_bots(self, admin: bool = False, user_roles: list[str] | None = None) -> list[BotRecord]:
        with self._session_ctx() as db:
            q = db.query(BotRow)
            if not admin:
                q = q.filter(BotRow.active == True)
            rows = q.order_by(BotRow.created_at).all()
            if admin:
                return [self._bot_row_to_record(r) for r in rows]
            result = []
            for r in rows:
                if r.restricted == "admin" and "admin" not in (user_roles or []):
                    continue
                result.append(self._bot_row_to_record(r))
            return result

    def get_bots_for_module(self, module_id: str, user_roles: list[str] | None = None) -> list[BotRecord]:
        with self._session_ctx() as db:
            rows = (
                db.query(BotRow)
                .filter(BotRow.active == True, BotRow.modules.contains([module_id]))
                .order_by(BotRow.created_at)
                .all()
            )
            result = []
            for r in rows:
                if r.restricted == "admin" and "admin" not in (user_roles or []):
                    continue
                result.append(self._bot_row_to_record(r))
            return result

    def get_bot_types(self) -> list[dict]:
        with self._session_ctx() as db:
            rows = db.query(BotTypeRow).order_by(BotTypeRow.name).all()
            return [self._bot_type_row_to_dict(r) for r in rows]

    def upsert_bot_type(self, data: dict) -> dict:
        with self._session_ctx() as db:
            row = db.query(BotTypeRow).filter(BotTypeRow.name == data["name"]).first()
            if not row:
                row = BotTypeRow(
                    id=str(uuid.uuid4()),
                    name=data["name"],
                    icon=data.get("icon", "🤖"),
                    description=data.get("description", ""),
                    preprompt=data.get("preprompt", ""),
                    skills=data.get("skills", []),
                    tools=data.get("tools", []),
                    output_format=data.get("output_format", "markdown"),
                    default_model=data.get("default_model", ""),
                    context_strategy=data.get("context_strategy", "conversational"),
                )
                db.add(row)
            else:
                row.icon = data.get("icon", row.icon)
                row.description = data.get("description", row.description)
                row.preprompt = data.get("preprompt", row.preprompt)
                row.skills = data.get("skills", row.skills)
                row.tools = data.get("tools", row.tools)
                row.output_format = data.get("output_format", row.output_format)
                row.default_model = data.get("default_model", row.default_model)
                row.context_strategy = data.get("context_strategy", row.context_strategy)
            db.commit()
            db.refresh(row)
            return self._bot_type_row_to_dict(row)

    def get_bot_by_id(self, bot_id: str) -> BotRecord | None:
        with self._session_ctx() as db:
            row = db.query(BotRow).filter(BotRow.id == bot_id).first()
            return self._bot_row_to_record(row) if row else None

    def create_bot(
        self,
        name: str,
        description: str,
        type: str,
        model: str,
        system_prompt: str,
        icon: str,
        active: bool,
        restricted: str,
        modules: list[str],
        created_by: str = "",
    ) -> BotRecord:
        with self._session_ctx() as db:
            row = BotRow(
                id=str(uuid.uuid4()),
                name=name,
                description=description,
                type=type,
                model=model,
                system_prompt=system_prompt,
                icon=icon,
                active=active and bool(modules),
                restricted=restricted,
                modules=modules,
                created_by=created_by,
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            return self._bot_row_to_record(row)

    def update_bot(
        self,
        bot_id: str,
        name: str,
        description: str,
        type: str,
        model: str,
        system_prompt: str,
        icon: str,
        active: bool,
        restricted: str,
        modules: list[str],
    ) -> BotRecord | None:
        with self._session_ctx() as db:
            row = db.query(BotRow).filter(BotRow.id == bot_id).first()
            if not row:
                return None
            row.name = name
            row.description = description
            row.type = type
            row.model = model
            row.system_prompt = system_prompt
            row.icon = icon
            row.active = active and bool(modules)
            row.restricted = restricted
            row.modules = modules
            db.commit()
            db.refresh(row)
            return self._bot_row_to_record(row)

    def delete_bot(self, bot_id: str) -> bool:
        with self._session_ctx() as db:
            row = db.query(BotRow).filter(BotRow.id == bot_id).first()
            if not row:
                return False
            db.delete(row)
            db.commit()
            return True

    # ------------------------------------------------------------------
    # Modules
    # ------------------------------------------------------------------

    def _module_row_to_dict(self, row: "ModuleRow") -> dict:
        return {
            "id": row.id,
            "name": row.name,
            "description": row.description or "",
            "remote_url": row.remote_url,
            "scope": row.scope,
            "component": row.component,
            "route": row.route,
            "icon": row.icon or "",
            "enabled": row.enabled,
            "roles": list(row.roles or []),
            "presets": row.presets or {"i18n": {}, "layout": {}, "settings": {}},
        }

    def get_modules(self, enabled_only: bool = False, user_roles: list[str] | None = None) -> list[dict]:
        with self._session_ctx() as db:
            q = db.query(ModuleRow)
            if enabled_only:
                q = q.filter(ModuleRow.enabled == True)
            rows = q.all()
            result = []
            for r in rows:
                if user_roles is not None:
                    mod_roles = list(r.roles or [])
                    if mod_roles and not any(role in mod_roles for role in user_roles):
                        continue
                result.append(self._module_row_to_dict(r))
            return result

    def get_module(self, module_id: str) -> dict | None:
        with self._session_ctx() as db:
            row = db.query(ModuleRow).filter(ModuleRow.id == module_id).first()
            return self._module_row_to_dict(row) if row else None

    def upsert_module(self, data: dict) -> dict:
        """Insert or update by scope — used for seeding and migration."""
        with self._session_ctx() as db:
            row = db.query(ModuleRow).filter(ModuleRow.scope == data["scope"]).first()
            if row:
                row.name = data.get("name", row.name)
                row.description = data.get("description", row.description or "")
                row.remote_url = data.get("remote_url", row.remote_url)
                row.component = data.get("component", row.component)
                row.route = data.get("route", row.route)
                row.icon = data.get("icon", row.icon)
                row.enabled = data.get("enabled", row.enabled)
                row.roles = data.get("roles", list(row.roles or []))
                row.presets = data.get("presets", row.presets)
            else:
                row = ModuleRow(
                    id=data.get("id") or str(uuid.uuid4()),
                    name=data["name"],
                    description=data.get("description", ""),
                    remote_url=data["remote_url"],
                    scope=data["scope"],
                    component=data.get("component", "./App"),
                    route=data["route"],
                    icon=data.get("icon", "🧩"),
                    enabled=data.get("enabled", True),
                    roles=data.get("roles", ["user", "admin"]),
                    presets=data.get("presets", {"i18n": {}, "layout": {}, "settings": {}}),
                )
                db.add(row)
            db.commit()
            db.refresh(row)
            return self._module_row_to_dict(row)

    def create_module(self, data: dict) -> dict:
        with self._session_ctx() as db:
            row = ModuleRow(
                id=str(uuid.uuid4()),
                name=data["name"],
                description=data.get("description", ""),
                remote_url=data["remote_url"],
                scope=data["scope"],
                component=data.get("component", "./App"),
                route=data["route"],
                icon=data.get("icon", "🧩"),
                enabled=data.get("enabled", True),
                roles=data.get("roles", ["user", "admin"]),
                presets=data.get("presets", {"i18n": {}, "layout": {}, "settings": {}}),
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            return self._module_row_to_dict(row)

    def update_module(self, module_id: str, data: dict) -> dict | None:
        with self._session_ctx() as db:
            row = db.query(ModuleRow).filter(ModuleRow.id == module_id).first()
            if not row:
                return None
            row.name = data.get("name", row.name)
            row.description = data.get("description", row.description or "")
            row.remote_url = data.get("remote_url", row.remote_url)
            row.component = data.get("component", row.component)
            row.route = data.get("route", row.route)
            row.icon = data.get("icon", row.icon)
            row.enabled = data.get("enabled", row.enabled)
            row.roles = data.get("roles", list(row.roles or []))
            row.presets = data.get("presets", row.presets)
            db.commit()
            db.refresh(row)
            return self._module_row_to_dict(row)

    def delete_module(self, module_id: str) -> bool:
        with self._session_ctx() as db:
            row = db.query(ModuleRow).filter(ModuleRow.id == module_id).first()
            if not row:
                return False
            db.delete(row)
            db.commit()
            return True

    # ------------------------------------------------------------------
    # i18n
    # ------------------------------------------------------------------

    def get_i18n_data(self, lang: str) -> dict | None:
        with self._session_ctx() as db:
            row = db.query(TranslationRow).filter(TranslationRow.lang == lang).first()
            return dict(row.data) if row else None

    def set_i18n_data(self, lang: str, data: dict) -> None:
        from datetime import datetime
        with self._session_ctx() as db:
            row = db.query(TranslationRow).filter(TranslationRow.lang == lang).first()
            if row:
                row.data = data
                row.updated_at = datetime.utcnow()
            else:
                db.add(TranslationRow(lang=lang, data=data, updated_at=datetime.utcnow()))
            db.commit()

    def merge_i18n_data(self, lang: str, defaults: dict) -> None:
        existing = self.get_i18n_data(lang) or {}
        self.set_i18n_data(lang, _deep_merge(defaults, existing))

    def get_i18n_versions(self) -> dict[str, str]:
        with self._session_ctx() as db:
            rows = db.query(TranslationRow.lang, TranslationRow.updated_at).all()
            return {
                r.lang: r.updated_at.isoformat() if r.updated_at else ""
                for r in rows
            }

    # ------------------------------------------------------------------
    # Module documents
    # ------------------------------------------------------------------

    def get_documents(
        self,
        module_id: str,
        collection: str,
        limit: int = 50,
        skip: int = 0,
    ) -> list[dict]:
        with self._session_ctx() as db:
            q = (
                db.query(ModuleDocumentRow)
                .filter(
                    ModuleDocumentRow.module_id == module_id,
                    ModuleDocumentRow.collection == collection,
                )
                .offset(skip)
                .limit(limit)
            )
            return [{"id": row.id, **(row.data or {})} for row in q.all()]

    def insert_document(self, module_id: str, collection: str, data: dict) -> str:
        with self._session_ctx() as db:
            row = ModuleDocumentRow(
                id=str(uuid.uuid4()),
                module_id=module_id,
                collection=collection,
                data=data,
            )
            db.add(row)
            db.commit()
            return row.id

    def update_document(self, module_id: str, collection: str, doc_id: str, update: dict) -> bool:
        with self._session_ctx() as db:
            row = (
                db.query(ModuleDocumentRow)
                .filter(
                    ModuleDocumentRow.id == doc_id,
                    ModuleDocumentRow.module_id == module_id,
                    ModuleDocumentRow.collection == collection,
                )
                .first()
            )
            if not row:
                return False
            row.data = update
            db.commit()
            return True

    def delete_document(self, module_id: str, collection: str, doc_id: str) -> bool:
        with self._session_ctx() as db:
            row = (
                db.query(ModuleDocumentRow)
                .filter(
                    ModuleDocumentRow.id == doc_id,
                    ModuleDocumentRow.module_id == module_id,
                    ModuleDocumentRow.collection == collection,
                )
                .first()
            )
            if not row:
                return False
            db.delete(row)
            db.commit()
            return True
