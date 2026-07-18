import uuid

from sqlalchemy import Column, Index, Integer, JSON, String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()  # shared SQLAlchemy metadata base; all ORM models inherit from this


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
