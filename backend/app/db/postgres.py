import uuid
from contextlib import contextmanager

from sqlalchemy import create_engine, Column, Index, Integer, JSON, String, Text, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import func

from app.db.interface import UserRecord, BotRecord
from app.queries.pg_migrations import PG_MIGRATION_STMTS

Base = declarative_base()


class UserRow(Base):
    """SQLAlchemy ORM model for the users table."""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    roles = Column(ARRAY(String), nullable=False, default=list)
    default_theme = Column(String, nullable=False, default="dark")


class PageRow(Base):
    """SQLAlchemy ORM model for the page_responses table."""
    __tablename__ = "page_responses"
    id = Column(Integer, primary_key=True, index=True)
    page_key = Column(String, unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False)


class BotTypeRow(Base):
    """SQLAlchemy ORM model for the bot_types table."""
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
    """SQLAlchemy ORM model for the bots table.

    Attributes:
        provider: LLM backend identifier — ``"ollama"`` (default), ``"anthropic"``,
            or ``"openai"``.  Added via migration so existing rows default to ``"ollama"``.
    """

    __tablename__ = "bots"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False, default="")
    type = Column(String, nullable=False, default="communicator")
    # provider selects the LLM backend; "ollama" keeps existing bots unchanged.
    provider = Column(String, nullable=False, default="ollama")
    model = Column(String, nullable=False, default="")
    system_prompt = Column(Text, nullable=False, default="")
    icon = Column(String, nullable=False, default="🤖")
    active = Column(Boolean, nullable=False, default=False)
    restricted = Column(String, nullable=False, default="user")
    modules = Column(ARRAY(String), nullable=False, default=list)
    created_by = Column(String, nullable=True, default="")
    config_schema = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TranslationRow(Base):
    """SQLAlchemy ORM model for the translations table."""
    __tablename__ = "translations"
    lang = Column(String, primary_key=True)
    data = Column(JSON, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)


class ModuleRow(Base):
    """SQLAlchemy ORM model for the modules table."""
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
    backend_url = Column(String, nullable=True)
    # groups bots/modules into a subscription tier; "system" means native platform scope
    subscription = Column(String, nullable=False, default="")


class ModuleDocumentRow(Base):
    """SQLAlchemy ORM model for the module_documents table."""
    __tablename__ = "module_documents"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    module_id = Column(String, nullable=False)
    collection = Column(String, nullable=False)
    data = Column(JSON, nullable=False, default=dict)

    __table_args__ = (
        Index("ix_module_documents_module_collection", "module_id", "collection"),
    )


class PageRegistryRow(Base):
    """SQLAlchemy ORM model for the page_registry table."""
    __tablename__ = "page_registry"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    route = Column(String, nullable=False, unique=True, index=True)
    title = Column(String, nullable=False, default="")
    type = Column(String, nullable=False, default="native")
    component_key = Column(String, nullable=True)
    remote_url = Column(String, nullable=True)
    scope = Column(String, nullable=True)
    component = Column(String, nullable=True)
    roles = Column(ARRAY(String), nullable=False, default=list)
    skeleton = Column(JSON, nullable=False, default=dict)
    enabled = Column(Boolean, nullable=False, default=True)


class UIComponentRow(Base):
    """SQLAlchemy ORM model for the ui_components table."""
    __tablename__ = "ui_components"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True)
    export = Column(String, nullable=False)
    file = Column(String, nullable=False)
    description = Column(Text, nullable=False, default="")
    props = Column(JSON, nullable=False, default=list)
    notes = Column(Text, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base, returning a new dict with override values preferred."""
    result = dict(base)
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


class PostgresAdapter:
    """Manages all PostgreSQL CRUD operations for the platform via SQLAlchemy."""
    def __init__(self, db_url: str) -> None:
        """Create the SQLAlchemy engine, session factory, schema, and run migrations."""
        self._engine = create_engine(db_url)
        self._Session = sessionmaker(autocommit=False, autoflush=False, bind=self._engine)
        Base.metadata.create_all(bind=self._engine)
        self._run_migrations()

    def _run_migrations(self) -> None:
        """Apply idempotent ALTER TABLE migrations to bring the schema up to date."""
        with self._engine.connect() as conn:
            for stmt in PG_MIGRATION_STMTS:
                conn.execute(text(stmt))
            conn.commit()

    def test_connection(self) -> None:
        with self._engine.connect():
            pass

    def _session(self):
        return self._Session()

    @contextmanager
    def _session_ctx(self):
        """Context manager that opens a SQLAlchemy session and closes it on exit."""
        db = self._session()
        try:
            yield db
        finally:
            db.close()

    def get_user_by_email(self, email: str) -> UserRecord | None:
        """Return the UserRecord for the given email, or None if not found."""
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
        """Insert a new user row and return the resulting UserRecord."""
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
        """Update the stored default_theme preference for a user by email."""
        with self._session_ctx() as db:
            row = db.query(UserRow).filter(UserRow.email == email).first()
            if row:
                row.default_theme = theme
                db.commit()

    def get_page(self, key: str) -> str | None:
        """Return the content string for the given page key, or None if absent."""
        with self._session_ctx() as db:
            row = db.query(PageRow).filter(PageRow.page_key == key).first()
            return row.content if row else None

    def upsert_page(self, key: str, content: str) -> None:
        """Insert or update the page_responses row for the given key."""
        with self._session_ctx() as db:
            row = db.query(PageRow).filter(PageRow.page_key == key).first()
            if row:
                row.content = content
            else:
                db.add(PageRow(page_key=key, content=content))
            db.commit()

    def _bot_row_to_record(self, row: BotRow) -> BotRecord:
        """Convert a BotRow ORM instance to a BotRecord dataclass.

        Args:
            row: SQLAlchemy ORM instance loaded from the ``bots`` table.

        Returns:
            A `BotRecord` dataclass with all fields populated.  The ``provider``
            field defaults to ``"ollama"`` when the column contains ``None`` (pre-migration rows).
        """
        return BotRecord(
            id=row.id,
            name=row.name,
            description=row.description,
            type=row.type,
            # Guard against pre-migration NULL in case the migration ran while the
            # server was live and an old row slips through before the transaction commits.
            provider=row.provider or "ollama",
            model=row.model,
            system_prompt=row.system_prompt,
            icon=row.icon,
            active=row.active,
            restricted=row.restricted or "user",
            modules=list(row.modules or []),
            created_by=row.created_by or "",
            # Same guard as `provider` above — pre-migration rows may have NULL before the ALTER TABLE commits.
            config_schema=dict(row.config_schema) if row.config_schema else {},
            created_at=row.created_at,
        )

    def _bot_type_row_to_dict(self, row: BotTypeRow) -> dict:
        """Convert a BotTypeRow ORM instance to a plain dictionary."""
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
        """Return bots filtered by active status and role visibility depending on the caller."""
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
        """Return active bots associated with a specific module, filtered by the caller's roles."""
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

    def seed_bots_for_module(self, module_id: str, bots_data: list[dict], created_by: str = "") -> list["BotRecord"]:
        """Provision bots declared in a module manifest, skipping any that already exist.

        Args:
            module_id: ID of the owning module; used as the sole entry in ``modules``.
            bots_data: List of bot dicts from the module manifest.  Each dict may
                include a ``provider`` key (defaults to ``"ollama"``).
            created_by: Email stored in ``created_by``; empty for system-provisioned bots.

        Returns:
            List of ``BotRecord`` instances for bots that were newly created (excludes skipped duplicates).
        """
        import sys
        new_bots: list[BotRecord] = []
        for bot in bots_data:
            name = bot.get("name", "").strip()
            if not name:
                continue
            with self._session_ctx() as db:
                exists = (
                    db.query(BotRow)
                    .filter(BotRow.name == name, BotRow.modules.contains([module_id]))
                    .first()
                )
            if exists:
                continue
            record = self.create_bot(
                name=name,
                description=bot.get("description", ""),
                type=bot.get("type", "communicator"),
                provider=bot.get("provider", "ollama"),
                model=bot.get("model", ""),
                system_prompt=bot.get("system_prompt", ""),
                icon=bot.get("icon", "🤖"),
                active=bot.get("active", True),
                restricted=bot.get("restricted", "user"),
                modules=[module_id],
                created_by=created_by,
                config_schema=bot.get("config_schema") or {},
            )
            new_bots.append(record)
            print(f"[spin-core] Provisioned bot '{name}' for module {module_id}", file=sys.stderr)
        return new_bots

    def get_bot_types(self) -> list[dict]:
        """Return all bot types ordered alphabetically by name."""
        with self._session_ctx() as db:
            rows = db.query(BotTypeRow).order_by(BotTypeRow.name).all()
            return [self._bot_type_row_to_dict(r) for r in rows]

    def upsert_bot_type(self, data: dict) -> dict:
        """Insert or update a bot type by name and return the resulting dict."""
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
        """Return the BotRecord for the given ID, or None if not found."""
        with self._session_ctx() as db:
            row = db.query(BotRow).filter(BotRow.id == bot_id).first()
            return self._bot_row_to_record(row) if row else None

    def create_bot(
        self,
        name: str,
        description: str,
        type: str,
        provider: str,
        model: str,
        system_prompt: str,
        icon: str,
        active: bool,
        restricted: str,
        modules: list[str],
        created_by: str = "",
        config_schema: dict | None = None,
    ) -> BotRecord:
        """Insert a new bot row and return the resulting BotRecord.

        Args:
            name: Display name for the bot.
            description: Short description of the bot's purpose.
            type: Bot-type slug (e.g. ``"communicator"``).
            provider: LLM backend — ``"ollama"``, ``"anthropic"``, or ``"openai"``.
            model: Provider-specific model identifier; empty string uses the provider default.
            system_prompt: Custom instructions prepended to each conversation.
            icon: Emoji representing the bot.
            active: Whether the bot is visible to non-admin users.  Forced to
                ``False`` when ``modules`` is empty.
            restricted: Role required to use this bot (``"user"`` or ``"admin"``).
            modules: Module IDs this bot is scoped to.
            created_by: Email of the creating admin.

        Returns:
            The newly inserted `BotRecord`.
        """
        with self._session_ctx() as db:
            row = BotRow(
                id=str(uuid.uuid4()),
                name=name,
                description=description,
                type=type,
                provider=provider,
                model=model,
                system_prompt=system_prompt,
                icon=icon,
                # A bot with no module assignments can never appear in any UI surface,
                # so activating it would be confusing — force it off.
                active=active and bool(modules),
                restricted=restricted,
                modules=modules,
                created_by=created_by,
                config_schema=config_schema or {},
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
        provider: str,
        model: str,
        system_prompt: str,
        icon: str,
        active: bool,
        restricted: str,
        modules: list[str],
        config_schema: dict | None = None,
    ) -> BotRecord | None:
        """Update an existing bot by ID and return the updated BotRecord, or None if not found.

        Args:
            bot_id: UUID of the bot to update.
            name: New display name.
            description: New description.
            type: New bot-type slug.
            provider: New LLM backend identifier.
            model: New provider-specific model identifier.
            system_prompt: New custom system instructions.
            icon: New emoji icon.
            active: New active flag; forced to ``False`` when ``modules`` is empty.
            restricted: New role restriction.
            modules: New module-ID list.

        Returns:
            Updated `BotRecord` on success, or ``None`` when ``bot_id`` is not found.
        """
        with self._session_ctx() as db:
            row = db.query(BotRow).filter(BotRow.id == bot_id).first()
            if not row:
                return None
            row.name = name
            row.description = description
            row.type = type
            row.provider = provider
            row.model = model
            row.system_prompt = system_prompt
            row.icon = icon
            row.active = active and bool(modules)
            row.restricted = restricted
            row.modules = modules
            # Only update when explicitly provided — admin-UI PUT omits this field and
            # must not silently clobber the manifest-seeded schema.
            if config_schema is not None:
                row.config_schema = config_schema
            db.commit()
            db.refresh(row)
            return self._bot_row_to_record(row)

    def delete_bot(self, bot_id: str) -> bool:
        """Delete a bot by ID and return True if the row existed."""
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
        """Convert a ModuleRow ORM instance to a plain dictionary."""
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
            "backend_url": row.backend_url or None,
            "subscription": row.subscription or "",
        }

    def get_modules(self, enabled_only: bool = False, user_roles: list[str] | None = None) -> list[dict]:
        """Return modules, optionally limited to enabled ones and filtered by the caller's roles."""
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
        """Return the module dict for the given ID, or None if not found."""
        with self._session_ctx() as db:
            row = db.query(ModuleRow).filter(ModuleRow.id == module_id).first()
            return self._module_row_to_dict(row) if row else None

    def get_module_by_id(self, module_id: str) -> dict | None:
        """Return the module dict for the given primary-key ID, or None if not found."""
        with self._session_ctx() as db:
            row = db.query(ModuleRow).filter(ModuleRow.id == module_id).first()
            return self._module_row_to_dict(row) if row else None

    def get_module_by_scope(self, scope: str) -> dict | None:
        """Return the module dict for the given Webpack federation scope, or None if not found."""
        with self._session_ctx() as db:
            row = db.query(ModuleRow).filter(ModuleRow.scope == scope).first()
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
                if "backend_url" in data:
                    row.backend_url = data["backend_url"] or None
                if "subscription" in data:
                    row.subscription = data["subscription"]
            else:
                row = ModuleRow(
                    id=data.get("id") or str(uuid.uuid4()),
                    name=data["name"],
                    description=data.get("description", ""),
                    # empty string allowed for built-in modules (scope='system') that have no federation remote
                    remote_url=data.get("remote_url", ""),
                    scope=data["scope"],
                    component=data.get("component", "./App"),
                    route=data.get("route", ""),
                    icon=data.get("icon", "🧩"),
                    enabled=data.get("enabled", True),
                    roles=data.get("roles", ["user", "admin"]),
                    presets=data.get("presets", {"i18n": {}, "layout": {}, "settings": {}}),
                    backend_url=data.get("backend_url") or None,
                    subscription=data.get("subscription", ""),
                )
                db.add(row)
            db.commit()
            db.refresh(row)
            return self._module_row_to_dict(row)

    def create_module(self, data: dict) -> dict:
        """Insert a new module row and return its dict representation."""
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
                backend_url=data.get("backend_url") or None,
                subscription=data.get("subscription", ""),
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            return self._module_row_to_dict(row)

    def update_module(self, module_id: str, data: dict) -> dict | None:
        """Update a module by ID and return the updated dict, or None if not found."""
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
            if "backend_url" in data:
                row.backend_url = data["backend_url"] or None
            db.commit()
            db.refresh(row)
            return self._module_row_to_dict(row)

    def delete_module(self, module_id: str) -> bool:
        """Delete a module by ID and return True if the row existed.

        Also removes the module_id from every bot's modules array; bots whose
        modules array becomes empty after removal are deleted outright.
        """
        with self._session_ctx() as db:
            row = db.query(ModuleRow).filter(ModuleRow.id == module_id).first()
            if not row:
                return False
            for bot in db.query(BotRow).filter(BotRow.modules.contains([module_id])).all():
                remaining = [m for m in (bot.modules or []) if m != module_id]
                if remaining:
                    bot.modules = remaining
                else:
                    db.delete(bot)
            db.delete(row)
            db.commit()
            return True

    # ------------------------------------------------------------------
    # i18n
    # ------------------------------------------------------------------

    def get_i18n_data(self, lang: str) -> dict | None:
        """Return the translation dict for the given language code, or None if absent."""
        with self._session_ctx() as db:
            row = db.query(TranslationRow).filter(TranslationRow.lang == lang).first()
            return dict(row.data) if row else None

    def set_i18n_data(self, lang: str, data: dict) -> None:
        """Upsert the full translation data dict for the given language code."""
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
        """Deep-merge defaults into the existing translation data, preserving admin overrides."""
        existing = self.get_i18n_data(lang) or {}
        self.set_i18n_data(lang, _deep_merge(defaults, existing))

    def get_i18n_versions(self) -> dict[str, str]:
        """Return a mapping of language code to ISO-formatted last-updated timestamp."""
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
        """Return paginated documents from a module collection, each merged with its ID."""
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
        """Insert a document into a module collection and return its generated ID."""
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
        """Replace a document's data payload and return True if the document existed."""
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
        """Delete a document from a module collection and return True if it existed."""
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

    def _page_registry_row_to_dict(self, row: "PageRegistryRow") -> dict:
        return {
            "id": row.id,
            "route": row.route,
            "title": row.title,
            "type": row.type,
            "component_key": row.component_key,
            "remote_url": row.remote_url,
            "scope": row.scope,
            "component": row.component,
            "roles": list(row.roles or []),
            "skeleton": dict(row.skeleton) if row.skeleton else {},
            "enabled": row.enabled,
        }

    def get_page_config(self, route: str) -> dict | None:
        """Return the page registry config for the given route, or None if absent."""
        with self._session_ctx() as db:
            row = db.query(PageRegistryRow).filter(PageRegistryRow.route == route).first()
            return self._page_registry_row_to_dict(row) if row else None

    def update_page_config(self, route: str, data: dict) -> dict | None:
        """Update mutable page registry fields for the given route and return the updated dict."""
        with self._session_ctx() as db:
            row = db.query(PageRegistryRow).filter(PageRegistryRow.route == route).first()
            if not row:
                return None
            for field in ("title", "roles", "skeleton", "enabled"):
                if field in data:
                    setattr(row, field, data[field])
            db.commit()
            db.refresh(row)
            return self._page_registry_row_to_dict(row)

    def seed_page_registry(self, route: str, data: dict) -> None:
        """Insert a page_registry entry only if the route does not already exist.

        Skips existing rows to preserve any admin edits to title/roles/skeleton made after initial seed.
        """
        with self._session_ctx() as db:
            existing = db.query(PageRegistryRow).filter(PageRegistryRow.route == route).first()
            if not existing:
                row = PageRegistryRow(
                    route=route,
                    title=data.get("title", ""),
                    type=data.get("type", "native"),
                    component_key=data.get("component_key"),
                    remote_url=data.get("remote_url"),
                    scope=data.get("scope"),
                    component=data.get("component"),
                    roles=data.get("roles", []),
                    skeleton=data.get("skeleton", {}),
                    enabled=data.get("enabled", True),
                )
                db.add(row)
                db.commit()

    # ── UI Components ────────────────────────────────────────────────────────

    def _ui_component_row_to_dict(self, row: UIComponentRow) -> dict:
        return {
            "id": row.id,
            "name": row.name,
            "export": row.export,
            "file": row.file,
            "description": row.description,
            "props": row.props or [],
            "notes": row.notes,
            "sort_order": row.sort_order,
        }

    def get_ui_components(self) -> list[dict]:
        """Return all UI component docs ordered by sort_order then name."""
        with self._session_ctx() as db:
            rows = db.query(UIComponentRow).order_by(UIComponentRow.sort_order, UIComponentRow.name).all()
            return [self._ui_component_row_to_dict(r) for r in rows]

    def upsert_ui_component(self, data: dict) -> dict:
        """Insert or update a UI component entry by name and return the resulting dict."""
        with self._session_ctx() as db:
            row = db.query(UIComponentRow).filter(UIComponentRow.name == data["name"]).first()
            if not row:
                row = UIComponentRow(
                    id=str(uuid.uuid4()),
                    name=data["name"],
                    export=data.get("export", data["name"]),
                    file=data.get("file", ""),
                    description=data.get("description", ""),
                    props=data.get("props", []),
                    notes=data.get("notes"),
                    sort_order=data.get("sort_order", 0),
                )
                db.add(row)
            else:
                row.export = data.get("export", row.export)
                row.file = data.get("file", row.file)
                row.description = data.get("description", row.description)
                row.props = data.get("props", row.props)
                row.notes = data.get("notes", row.notes)
                row.sort_order = data.get("sort_order", row.sort_order)
            db.commit()
            db.refresh(row)
            return self._ui_component_row_to_dict(row)
