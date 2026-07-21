import uuid
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.interface import UserRecord, BotRecord
from app.db.postgres.orm import (
    Base, UserRow, PageRow, BotTypeRow, BotRow, TranslationRow,
    ModuleRow, ModuleDocumentRow, PageRegistryRow,
)
from app.db.postgres.utils import _deep_merge
from app.queries.pg_migrations import PG_MIGRATION_STMTS


class PostgresAdapter:
    """Manages all PostgreSQL CRUD operations for the platform via SQLAlchemy."""
    def __init__(self, db_url: str) -> None:
        """Create the SQLAlchemy engine, session factory, schema, and run migrations."""
        self._engine = create_engine(db_url)  # create the SQLAlchemy engine for the given PostgreSQL DSN
        self._Session = sessionmaker(autocommit=False, autoflush=False, bind=self._engine)  # session factory; autocommit=False gives explicit transaction control
        Base.metadata.create_all(bind=self._engine)  # create all tables that don't already exist (idempotent)
        self._run_migrations()  # apply any schema changes not handled by create_all

    def _run_migrations(self) -> None:
        """Apply idempotent ALTER TABLE migrations to bring the schema up to date."""
        with self._engine.connect() as conn:
            for stmt in PG_MIGRATION_STMTS:  # iterate each ALTER TABLE / ADD COLUMN IF NOT EXISTS statement
                conn.execute(text(stmt))  # execute as raw SQL; each statement is idempotent
            conn.commit()  # commit all migration statements in a single transaction

    def test_connection(self) -> None:
        with self._engine.connect():  # open and immediately close a connection; raises on DB unreachable
            pass

    def _session(self):
        return self._Session()  # create a new SQLAlchemy session bound to the engine

    @contextmanager
    def _session_ctx(self):
        """Context manager that opens a SQLAlchemy session and closes it on exit."""
        db = self._session()  # obtain a fresh session for this operation
        try:
            yield db  # hand the session to the caller's with-block
        finally:
            db.close()  # always release the connection back to the pool

    def get_user_by_email(self, email: str) -> UserRecord | None:
        """Return the UserRecord for the given email, or None if not found."""
        with self._session_ctx() as db:
            row = db.query(UserRow).filter(UserRow.email == email).first()  # case-sensitive exact match on the unique email column
            if not row:
                return None  # caller must handle the None case (e.g. raise 401)
            return UserRecord(
                email=row.email,
                name=row.name,
                hashed_password=row.hashed_password,
                roles=list(row.roles),        # convert Postgres ARRAY to a plain Python list
                default_theme=row.default_theme,
            )

    def create_user(
        self,
        email: str,
        name: str,
        hashed_password: str,
        roles: list[str],
        default_theme: str,
        created_by: str = "system",  # email of the admin who created this user, or 'system' for seeded users
    ) -> UserRecord:
        """Insert a new user row and return the resulting UserRecord."""
        owner = created_by or "system"  # owner mirrors created_by at creation time
        with self._session_ctx() as db:
            row = UserRow(
                email=email,
                name=name,
                hashed_password=hashed_password,
                roles=roles,
                default_theme=default_theme,
                owner=owner,
                created_by=owner,
            )
            db.add(row)    # stage the new row for insert
            db.commit()    # flush and commit; auto-increment id is assigned by the DB
            db.refresh(row)  # reload server-set fields (created_on)
            return UserRecord(
                email=email, name=name, hashed_password=hashed_password,
                roles=roles, default_theme=default_theme,
                owner=owner, created_by=owner,
                created_on=row.created_on,
            )

    def update_user_theme(self, email: str, theme: str) -> None:
        """Update the stored default_theme preference for a user by email."""
        with self._session_ctx() as db:
            row = db.query(UserRow).filter(UserRow.email == email).first()  # locate the user by email
            if row:  # silently no-op for unknown emails; callers already validate via token
                row.default_theme = theme  # mutate the ORM instance; SQLAlchemy tracks the change
                db.commit()  # flush the UPDATE to the DB

    def ensure_user_has_role(self, email: str, role: str) -> bool:
        """Add role to the user's roles array if not already present. Returns True if the row was updated."""
        with self._session_ctx() as db:
            row = db.query(UserRow).filter(UserRow.email == email).first()  # locate by email
            if not row or role in row.roles:  # no-op when user absent or role already present
                return False
            row.roles = list(row.roles) + [role]  # SQLAlchemy needs a new list object to detect the ARRAY mutation
            db.commit()  # flush the UPDATE to the DB
            return True

    def get_page(self, key: str) -> str | None:
        """Return the content string for the given page key, or None if absent."""
        with self._session_ctx() as db:
            row = db.query(PageRow).filter(PageRow.page_key == key).first()  # look up the page by its logical key
            return row.content if row else None  # return the raw content string or None if the key is absent

    def upsert_page(self, key: str, content: str, updated_by: str | None = None) -> None:
        """Insert or update the page_responses row for the given key."""
        from datetime import datetime
        with self._session_ctx() as db:
            row = db.query(PageRow).filter(PageRow.page_key == key).first()  # check for an existing row before deciding insert vs update
            if row:
                row.content = content  # update in-place; SQLAlchemy tracks the change
                if updated_by:
                    row.updated_by = updated_by
                    row.updated_on = datetime.utcnow()
            else:
                db.add(PageRow(page_key=key, content=content))  # no existing row; insert a new one
            db.commit()  # flush the change to the DB

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
            config_schema=dict(row.config_schema) if row.config_schema else {},
            owner=row.owner or "system",
            updated_by=row.updated_by or None,
            created_on=row.created_on,   # renamed from created_at via pg_migrations
            updated_on=row.updated_on,   # None until first explicit edit
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
            "owner": row.owner or "system",
            "created_by": row.created_by or "system",
            "updated_by": row.updated_by,
            "created_on": row.created_on,
            "updated_on": row.updated_on,
        }

    def get_bots(self, admin: bool = False, user_roles: list[str] | None = None) -> list[BotRecord]:
        """Return bots filtered by active status and role visibility depending on the caller."""
        with self._session_ctx() as db:
            q = db.query(BotRow)
            if not admin:
                q = q.filter(BotRow.active == True)  # non-admins only see bots with active=True
            rows = q.order_by(BotRow.created_on).all()  # stable chronological order
            if admin:
                return [self._bot_row_to_record(r) for r in rows]  # admins see every bot regardless of restricted flag
            result = []
            for r in rows:
                if r.restricted == "admin" and "admin" not in (user_roles or []):
                    continue  # skip admin-restricted bots when the caller lacks the admin role
                result.append(self._bot_row_to_record(r))
            return result  # filtered list visible to this caller

    def get_bots_for_module(self, module_id: str, user_roles: list[str] | None = None) -> list[BotRecord]:
        """Return active bots associated with a specific module, filtered by the caller's roles."""
        with self._session_ctx() as db:
            rows = (
                db.query(BotRow)
                .filter(BotRow.active == True, BotRow.modules.contains([module_id]))  # Postgres ARRAY @> operator checks membership
                .order_by(BotRow.created_on)  # stable chronological order
                .all()
            )
            result = []
            for r in rows:
                if r.restricted == "admin" and "admin" not in (user_roles or []):
                    continue  # hide admin-restricted bots from users without the admin role
                result.append(self._bot_row_to_record(r))
            return result  # filtered list of bots scoped to this module

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
        new_bots: list[BotRecord] = []  # accumulates only the newly created bots (skips duplicates)
        for bot in bots_data:
            name = bot.get("name", "").strip()  # name is the deduplication key
            if not name:
                continue  # skip entries without a name to avoid creating anonymous bots
            with self._session_ctx() as db:
                exists = (
                    db.query(BotRow)
                    .filter(BotRow.name == name, BotRow.modules.contains([module_id]))  # check for exact name + module membership
                    .first()
                )
            if exists:
                continue  # already provisioned; do not overwrite admin edits
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
                owner=created_by or "system",  # owner mirrors creator; 'system' for manifest-seeded bots
            )
            new_bots.append(record)  # track for log emission by the caller
            print(f"[spin-core] Provisioned bot '{name}' for module {module_id}", file=sys.stderr)  # log to stderr so it appears in Docker logs
        return new_bots  # caller uses this to emit BotEvent.INIT log entries

    def get_bot_types(self) -> list[dict]:
        """Return all bot types ordered alphabetically by name."""
        with self._session_ctx() as db:
            rows = db.query(BotTypeRow).order_by(BotTypeRow.name).all()  # alphabetical order for stable UI display
            return [self._bot_type_row_to_dict(r) for r in rows]  # convert ORM rows to plain dicts for JSON serialisation

    def upsert_bot_type(self, data: dict) -> dict:
        """Insert or update a bot type by name and return the resulting dict."""
        from datetime import datetime
        owner = data.get("owner") or data.get("created_by") or "system"  # owner mirrors creator for seed rows
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
                    owner=owner,
                    created_by=owner,
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
                if data.get("updated_by"):
                    row.updated_by = data["updated_by"]
                    row.updated_on = datetime.utcnow()
            db.commit()
            db.refresh(row)
            return self._bot_type_row_to_dict(row)

    def get_bot_by_id(self, bot_id: str) -> BotRecord | None:
        """Return the BotRecord for the given ID, or None if not found."""
        with self._session_ctx() as db:
            row = db.query(BotRow).filter(BotRow.id == bot_id).first()  # UUID primary-key lookup
            return self._bot_row_to_record(row) if row else None  # None signals a 404 to the caller

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
        owner: str = "",  # defaults to created_by when empty; 'system' for seeded bots
    ) -> BotRecord:
        """Insert a new bot row and return the resulting BotRecord."""
        effective_owner = owner or created_by or "system"  # owner = creator at creation time
        with self._session_ctx() as db:
            row = BotRow(
                id=str(uuid.uuid4()),  # generate a fresh UUID as the primary key
                name=name,
                description=description,
                type=type,
                provider=provider,
                model=model,
                system_prompt=system_prompt,
                icon=icon,
                # A bot with no module assignments can never appear in any UI surface,
                # so activating it would be confusing — force it off.
                active=active and bool(modules),  # coerce active to False when modules list is empty
                restricted=restricted,
                modules=modules,
                created_by=created_by,
                config_schema=config_schema or {},  # default to empty dict if caller passes None
                owner=effective_owner,
            )
            db.add(row)     # stage the insert
            db.commit()     # persist to the DB
            db.refresh(row)  # reload server-set fields (created_on, updated_on)
            return self._bot_row_to_record(row)  # convert to the database-agnostic BotRecord

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
        updated_by: str = "",  # email of the admin performing the update
    ) -> BotRecord | None:
        """Update an existing bot by ID and return the updated BotRecord, or None if not found."""
        from datetime import datetime
        with self._session_ctx() as db:
            row = db.query(BotRow).filter(BotRow.id == bot_id).first()  # locate the row to update
            if not row:
                return None  # signals a 404 to the caller
            row.name = name
            row.description = description
            row.type = type
            row.provider = provider
            row.model = model
            row.system_prompt = system_prompt
            row.icon = icon
            row.active = active and bool(modules)  # force active=False when modules list becomes empty
            row.restricted = restricted
            row.modules = modules
            # Only update when explicitly provided — admin-UI PUT omits this field and
            # must not silently clobber the manifest-seeded schema.
            if config_schema is not None:  # None means "leave existing schema unchanged"
                row.config_schema = config_schema
            if updated_by:
                row.updated_by = updated_by
                row.updated_on = datetime.utcnow()  # explicit write; not relying solely on onupdate
            db.commit()      # persist all mutations
            db.refresh(row)  # reload server-set fields (updated_on)
            return self._bot_row_to_record(row)  # convert to the database-agnostic BotRecord

    def delete_bot(self, bot_id: str) -> bool:
        """Delete a bot by ID and return True if the row existed."""
        with self._session_ctx() as db:
            row = db.query(BotRow).filter(BotRow.id == bot_id).first()  # locate the row to delete
            if not row:
                return False  # signals a 404 to the caller
            db.delete(row)  # stage the DELETE
            db.commit()     # execute and commit
            return True  # confirm the row was found and deleted

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
            "configuration_raw": row.configuration_raw,  # None when no manifest was fetched at registration time
            "owner": row.owner or "system",
            "created_by": row.created_by or "system",
            "updated_by": row.updated_by,
            "created_on": row.created_on,
            "updated_on": row.updated_on,
        }

    def get_modules(self, enabled_only: bool = False, user_roles: list[str] | None = None) -> list[dict]:
        """Return modules, optionally limited to enabled ones and filtered by the caller's roles."""
        with self._session_ctx() as db:
            q = db.query(ModuleRow)
            if enabled_only:
                q = q.filter(ModuleRow.enabled == True)  # sidebar view; only enabled modules shown
            rows = q.all()
            result = []
            for r in rows:
                if user_roles is not None:  # None means "no role filter" (admin context)
                    mod_roles = list(r.roles or [])
                    if mod_roles and not any(role in mod_roles for role in user_roles):
                        continue  # skip modules whose role list does not intersect the caller's roles
                result.append(self._module_row_to_dict(r))
            return result  # filtered list ready for JSON serialisation

    def get_module(self, module_id: str) -> dict | None:
        """Return the module dict for the given ID, or None if not found."""
        with self._session_ctx() as db:
            row = db.query(ModuleRow).filter(ModuleRow.id == module_id).first()  # UUID primary-key lookup
            return self._module_row_to_dict(row) if row else None  # None signals a 404 to the caller

    def get_module_by_id(self, module_id: str) -> dict | None:
        """Return the module dict for the given primary-key ID, or None if not found."""
        with self._session_ctx() as db:
            row = db.query(ModuleRow).filter(ModuleRow.id == module_id).first()  # UUID primary-key lookup
            return self._module_row_to_dict(row) if row else None

    def get_module_by_scope(self, scope: str) -> dict | None:
        """Return the module dict for the given Webpack federation scope, or None if not found."""
        with self._session_ctx() as db:
            row = db.query(ModuleRow).filter(ModuleRow.scope == scope).first()  # unique-index lookup on the scope column
            return self._module_row_to_dict(row) if row else None

    def upsert_module(self, data: dict) -> dict:
        """Insert or update by scope — used for seeding and migration."""
        from datetime import datetime
        owner = data.get("owner") or data.get("created_by") or "system"  # owner mirrors creator for seed rows
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
                if "configuration_raw" in data:
                    row.configuration_raw = data["configuration_raw"] or None
                if data.get("updated_by"):
                    row.updated_by = data["updated_by"]
                    row.updated_on = datetime.utcnow()
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
                    configuration_raw=data.get("configuration_raw") or None,  # manifest snapshot; None for seed modules
                    owner=owner,
                    created_by=owner,
                )
                db.add(row)
            db.commit()
            db.refresh(row)
            return self._module_row_to_dict(row)

    def create_module(self, data: dict) -> dict:
        """Insert a new module row and return its dict representation."""
        owner = data.get("owner") or data.get("created_by") or "system"  # owner = creator at creation time
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
                configuration_raw=data.get("configuration_raw") or None,  # full manifest snapshot; None when not provided
                owner=owner,
                created_by=owner,
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            return self._module_row_to_dict(row)

    def update_module(self, module_id: str, data: dict, updated_by: str = "") -> dict | None:
        """Update a module by ID and return the updated dict, or None if not found."""
        from datetime import datetime
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
            if "configuration_raw" in data:
                row.configuration_raw = data["configuration_raw"] or None  # explicit None clears the snapshot
            effective_updater = updated_by or data.get("updated_by", "")
            if effective_updater:
                row.updated_by = effective_updater
                row.updated_on = datetime.utcnow()
            db.commit()
            db.refresh(row)
            return self._module_row_to_dict(row)

    def delete_module(self, module_id: str) -> bool:
        """Delete a module by ID and return True if the row existed.

        Also removes the module_id from every bot's modules array; bots whose
        modules array becomes empty after removal are deleted outright.
        """
        with self._session_ctx() as db:
            row = db.query(ModuleRow).filter(ModuleRow.id == module_id).first()  # locate the module row to delete
            if not row:
                return False  # signals a 404 to the caller
            for bot in db.query(BotRow).filter(BotRow.modules.contains([module_id])).all():  # find every bot scoped to this module
                remaining = [m for m in (bot.modules or []) if m != module_id]  # remove the deleted module from the bot's list
                if remaining:
                    bot.modules = remaining  # still has other modules; just update the array
                else:
                    db.delete(bot)  # orphaned bot with no modules left; remove it entirely
            db.delete(row)  # stage the module row deletion
            db.commit()     # commit the module delete and all bot changes atomically
            return True  # confirms the row was found and deleted

    # ------------------------------------------------------------------
    # i18n
    # ------------------------------------------------------------------

    def get_i18n_data(self, lang: str) -> dict | None:
        """Return the translation dict for the given language code, or None if absent."""
        with self._session_ctx() as db:
            row = db.query(TranslationRow).filter(TranslationRow.lang == lang).first()  # primary-key lookup on the lang column
            return dict(row.data) if row else None  # copy to a plain dict; None when the language hasn't been seeded yet

    def set_i18n_data(self, lang: str, data: dict) -> None:
        """Upsert the full translation data dict for the given language code."""
        from datetime import datetime
        with self._session_ctx() as db:
            row = db.query(TranslationRow).filter(TranslationRow.lang == lang).first()  # check for an existing row
            if row:
                row.data = data                        # replace the full JSON blob
                row.updated_on = datetime.utcnow()    # bump the timestamp for version tracking
            else:
                db.add(TranslationRow(lang=lang, data=data, updated_on=datetime.utcnow()))  # first-time insert for this language
            db.commit()  # persist the change

    def merge_i18n_data(self, lang: str, defaults: dict) -> None:
        """Deep-merge defaults into the existing translation data, preserving admin overrides."""
        existing = self.get_i18n_data(lang) or {}  # treat a missing language as an empty dict
        self.set_i18n_data(lang, _deep_merge(defaults, existing))  # admin edits win over defaults because existing is the override arg

    def get_i18n_versions(self) -> dict[str, str]:
        """Return a mapping of language code to ISO-formatted last-updated timestamp."""
        with self._session_ctx() as db:
            rows = db.query(TranslationRow.lang, TranslationRow.updated_on).all()  # select only two columns; avoids loading the large data JSON
            return {
                r.lang: r.updated_on.isoformat() if r.updated_on else ""  # empty string for rows with no timestamp
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
                    ModuleDocumentRow.module_id == module_id,   # scope to the owning module
                    ModuleDocumentRow.collection == collection,  # scope to the named collection
                )
                .offset(skip)
                .limit(limit)
            )
            return [{"id": row.id, **(row.data or {})} for row in q.all()]  # merge the PK into the data dict for the caller

    def insert_document(self, module_id: str, collection: str, data: dict) -> str:
        """Insert a document into a module collection and return its generated ID."""
        with self._session_ctx() as db:
            row = ModuleDocumentRow(
                id=str(uuid.uuid4()),  # generate a fresh UUID as the document PK
                module_id=module_id,
                collection=collection,
                data=data,
            )
            db.add(row)    # stage the insert
            db.commit()    # persist; id is already known (not server-generated) so no refresh needed
            return row.id  # return the generated UUID to the caller for use as the document reference

    def update_document(self, module_id: str, collection: str, doc_id: str, update: dict) -> bool:
        """Replace a document's data payload and return True if the document existed."""
        with self._session_ctx() as db:
            row = (
                db.query(ModuleDocumentRow)
                .filter(
                    ModuleDocumentRow.id == doc_id,              # locate by PK
                    ModuleDocumentRow.module_id == module_id,    # scope guard: prevent cross-module updates
                    ModuleDocumentRow.collection == collection,   # scope guard: prevent cross-collection updates
                )
                .first()
            )
            if not row:
                return False  # signals a 404 to the caller
            row.data = update  # replace the full JSON payload; partial updates are not supported
            db.commit()        # persist
            return True  # confirms the document was found and updated

    def delete_document(self, module_id: str, collection: str, doc_id: str) -> bool:
        """Delete a document from a module collection and return True if it existed."""
        with self._session_ctx() as db:
            row = (
                db.query(ModuleDocumentRow)
                .filter(
                    ModuleDocumentRow.id == doc_id,              # locate by PK
                    ModuleDocumentRow.module_id == module_id,    # scope guard: prevent cross-module deletes
                    ModuleDocumentRow.collection == collection,   # scope guard: prevent cross-collection deletes
                )
                .first()
            )
            if not row:
                return False  # signals a 404 to the caller
            db.delete(row)  # stage the DELETE
            db.commit()     # execute and commit
            return True  # confirms the document was found and deleted

    def _page_registry_row_to_dict(self, row: "PageRegistryRow") -> dict:
        """Convert a PageRegistryRow ORM instance to a plain dictionary."""
        return {
            "id": row.id,
            "route": row.route,
            "title": row.title,
            "type": row.type,
            "component_key": row.component_key,
            "remote_url": row.remote_url,
            "scope": row.scope,
            "component": row.component,
            "roles": list(row.roles or []),            # convert ARRAY to list; guard against NULL
            "skeleton": dict(row.skeleton) if row.skeleton else {},  # copy to plain dict; empty dict for NULL rows
            "enabled": row.enabled,
        }

    def list_pages(self) -> list[dict]:
        """Return all page_registry rows ordered by route."""
        with self._session_ctx() as db:
            rows = db.query(PageRegistryRow).order_by(PageRegistryRow.route).all()  # alphabetical route order for stable UI display
            return [self._page_registry_row_to_dict(row) for row in rows]  # normalise ORM rows to plain dicts before returning

    def get_page_config(self, route: str) -> dict | None:
        """Return the page registry config for the given route, or None if absent."""
        with self._session_ctx() as db:
            row = db.query(PageRegistryRow).filter(PageRegistryRow.route == route).first()  # unique-index lookup on the route column
            return self._page_registry_row_to_dict(row) if row else None  # None signals a 404 to the caller

    def update_page_config(self, route: str, data: dict) -> dict | None:
        """Update mutable page registry fields for the given route and return the updated dict."""
        with self._session_ctx() as db:
            row = db.query(PageRegistryRow).filter(PageRegistryRow.route == route).first()  # locate by unique route
            if not row:
                return None  # signals a 404 to the caller
            for field in ("title", "roles", "skeleton", "enabled"):  # only mutable fields; type/component/remote_url are immutable post-seed
                if field in data:
                    setattr(row, field, data[field])  # apply each provided field; omitted fields are left unchanged
            db.commit()      # persist the mutations
            db.refresh(row)  # reload the row to pick up any server-set values
            return self._page_registry_row_to_dict(row)  # return the updated config to the caller

    def delete_page_registry(self, route: str) -> bool:
        """Delete a page_registry row by route. Returns True if a row was deleted."""
        with self._session_ctx() as db:
            row = db.query(PageRegistryRow).filter(PageRegistryRow.route == route).first()
            if not row:
                return False
            db.delete(row)  # remove the stale row permanently
            db.commit()
            return True

    def seed_page_registry(self, route: str, data: dict) -> None:
        """Insert a page_registry entry only if the route does not already exist.

        Skips existing rows to preserve any admin edits to title/roles/skeleton made after initial seed.
        """
        with self._session_ctx() as db:
            existing = db.query(PageRegistryRow).filter(PageRegistryRow.route == route).first()  # check for a prior seed
            if not existing:  # only insert on first run; subsequent startups must not overwrite admin edits
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
                    owner="system",      # all registry entries are system-seeded at startup
                    created_by="system",
                )
                db.add(row)    # stage the insert
                db.commit()    # persist; no refresh needed since caller doesn't use the returned row

