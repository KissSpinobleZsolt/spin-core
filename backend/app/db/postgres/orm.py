import uuid

from sqlalchemy import Column, Index, Integer, JSON, String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()  # shared SQLAlchemy metadata base; all ORM models inherit from this


class UserRow(Base):
    """SQLAlchemy ORM model for the users table."""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)                       # auto-increment surrogate key
    email = Column(String, unique=True, nullable=False, index=True)           # primary identity; must be unique across all users
    name = Column(String, nullable=False)                                      # display name shown in the UI header
    hashed_password = Column(String, nullable=False)                           # bcrypt hash; never exposed to clients
    roles = Column(ARRAY(String), nullable=False, default=list)                # role slugs controlling route and UI access
    default_theme = Column(String, nullable=False, default="dark")             # persisted theme preference ("dark" or "light")


class PageRow(Base):
    """SQLAlchemy ORM model for the page_responses table."""
    __tablename__ = "page_responses"
    id = Column(Integer, primary_key=True, index=True)              # auto-increment surrogate key
    page_key = Column(String, unique=True, nullable=False, index=True)  # logical key (e.g. "dashboard") used for lookup
    content = Column(Text, nullable=False)                           # Markdown or HTML body for the page


class BotTypeRow(Base):
    """SQLAlchemy ORM model for the bot_types table."""
    __tablename__ = "bot_types"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))  # UUID PK; generated on insert
    name = Column(String, nullable=False, unique=True)                         # unique slug used to match bots to their type
    icon = Column(String, nullable=False, default="🤖")                        # emoji shown in the bot-type picker
    description = Column(String, nullable=False, default="")                   # short description of what this type of bot does
    preprompt = Column(Text, nullable=False, default="")                       # instructions prepended to every bot of this type
    skills = Column(ARRAY(String), nullable=False, default=list)               # capability tags (informational; not yet enforced)
    tools = Column(ARRAY(String), nullable=False, default=list)                # tool identifiers the bot type is allowed to call
    output_format = Column(String, nullable=False, default="markdown")         # preferred output format ("markdown" or "plain")
    default_model = Column(String, nullable=False, default="")                 # model name used when a bot of this type has no explicit model
    context_strategy = Column(String, nullable=False, default="conversational")  # how conversation history is managed ("conversational" or "single-shot")


class BotRow(Base):
    """SQLAlchemy ORM model for the bots table.

    Attributes:
        provider: LLM backend identifier — ``"ollama"`` (default), ``"anthropic"``,
            or ``"openai"``.  Added via migration so existing rows default to ``"ollama"``.
    """

    __tablename__ = "bots"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))  # UUID PK; generated at creation time
    name = Column(String, nullable=False)                                       # display name; used as the bot_logs.bot_name filter key
    description = Column(Text, nullable=False, default="")                      # short description shown in the bot picker
    type = Column(String, nullable=False, default="communicator")               # bot-type slug; matched against BotTypeRow.name
    # provider selects the LLM backend; "ollama" keeps existing bots unchanged.
    provider = Column(String, nullable=False, default="ollama")                 # LLM backend: "ollama", "anthropic", or "openai"
    model = Column(String, nullable=False, default="")                          # provider-specific model string; empty uses adapter default
    system_prompt = Column(Text, nullable=False, default="")                    # custom instructions injected before each conversation
    icon = Column(String, nullable=False, default="🤖")                         # emoji displayed in bot lists and chat headers
    active = Column(Boolean, nullable=False, default=False)                     # False hides the bot from non-admin users
    restricted = Column(String, nullable=False, default="user")                 # minimum role to start a conversation ("user" or "admin")
    modules = Column(ARRAY(String), nullable=False, default=list)               # module IDs this bot is scoped to
    created_by = Column(String, nullable=True, default="")                      # email of the admin who created this bot
    config_schema = Column(JSON, nullable=False, default=dict)                  # declarative UI schema for the bot config page
    created_at = Column(DateTime, server_default=func.now())                    # server-set creation timestamp
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())  # auto-updated on every write


class TranslationRow(Base):
    """SQLAlchemy ORM model for the translations table."""
    __tablename__ = "translations"
    lang = Column(String, primary_key=True)              # ISO 639-1 language code (e.g. "en", "ro")
    data = Column(JSON, nullable=False)                  # nested translation key-value tree for the language
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)  # tracks when translations were last merged or edited


class ModuleRow(Base):
    """SQLAlchemy ORM model for the modules table."""
    __tablename__ = "modules"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))  # UUID PK
    name = Column(String, nullable=False)                                       # display name shown in the sidebar and discovery panel
    description = Column(String, nullable=False, default="")                    # short description shown in the module picker
    remote_url = Column(String, nullable=False)                                 # browser-accessible URL of remoteEntry.js
    scope = Column(String, nullable=False, unique=True)                         # Webpack federation container name; must be unique
    component = Column(String, nullable=False)                                  # exposed component path (e.g. "./App")
    route = Column(String, nullable=False)                                      # URL slug under /modules/
    icon = Column(String, nullable=False, default="🧩")                         # emoji used in sidebar navigation
    enabled = Column(Boolean, nullable=False, default=True)                     # False hides the module from the sidebar
    roles = Column(ARRAY(String), nullable=False, default=list)                 # role slugs that may access this module
    presets = Column(JSON, nullable=False, default=dict)                        # {i18n, layout, settings} injected as props into the remote
    backend_url = Column(String, nullable=True)                                 # optional URL of the module's own backend; enables the plugin proxy
    # groups bots/modules into a subscription tier; "system" means native platform scope
    subscription = Column(String, nullable=False, default="")                   # subscription tier slug; empty string means unrestricted


class ModuleDocumentRow(Base):
    """SQLAlchemy ORM model for the module_documents table."""
    __tablename__ = "module_documents"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))  # UUID PK
    module_id = Column(String, nullable=False)    # FK-like reference to ModuleRow.id (not enforced at DB level)
    collection = Column(String, nullable=False)   # logical bucket within the module's document store
    data = Column(JSON, nullable=False, default=dict)  # arbitrary JSON payload for the document

    __table_args__ = (
        Index("ix_module_documents_module_collection", "module_id", "collection"),  # composite index for fast collection-scoped queries
    )


class PageRegistryRow(Base):
    """SQLAlchemy ORM model for the page_registry table."""
    __tablename__ = "page_registry"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))  # UUID PK
    route = Column(String, nullable=False, unique=True, index=True)            # URL path used for lookup (e.g. "/bots")
    title = Column(String, nullable=False, default="")                         # human-readable page title shown in breadcrumbs
    type = Column(String, nullable=False, default="native")                    # "native" (React route) or "federated" (MF remote)
    component_key = Column(String, nullable=True)                              # key used to resolve the native React component
    remote_url = Column(String, nullable=True)                                 # remoteEntry.js URL for federated pages
    scope = Column(String, nullable=True)                                      # Webpack federation scope for federated pages
    component = Column(String, nullable=True)                                  # exposed component path for federated pages
    roles = Column(ARRAY(String), nullable=False, default=list)                # roles that may access this page
    skeleton = Column(JSON, nullable=False, default=dict)                      # loading skeleton config rendered while the page loads
    enabled = Column(Boolean, nullable=False, default=True)                    # False hides the page from the router


class UIComponentRow(Base):
    """SQLAlchemy ORM model for the ui_components table."""
    __tablename__ = "ui_components"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))  # UUID PK
    name = Column(String, nullable=False, unique=True)                          # unique component name used as the lookup key
    export = Column(String, nullable=False)                                     # named export from the component file
    file = Column(String, nullable=False)                                       # source file path relative to the frontend src directory
    description = Column(Text, nullable=False, default="")                      # documentation description rendered in the UI catalogue
    props = Column(JSON, nullable=False, default=list)                          # list of PropSchema objects describing accepted props
    notes = Column(Text, nullable=True)                                         # optional freeform notes for developers
    sort_order = Column(Integer, nullable=False, default=0)                     # ascending sort key controlling display order in the catalogue
