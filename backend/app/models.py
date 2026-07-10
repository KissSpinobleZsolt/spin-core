from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    roles = Column(ARRAY(String), nullable=False, default=list)
    default_theme = Column(String, nullable=False, default="dark")


class PageResponse(Base):
    __tablename__ = "page_responses"

    id = Column(Integer, primary_key=True, index=True)
    page_key = Column(String, unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False)
