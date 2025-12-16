from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime, Float, JSON, MetaData
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from datetime import datetime

from database import Base

metadata = MetaData(naming_convention={
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
})

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(255))
    
    tests = relationship("Test", back_populates="user")

class Test(Base):
    __tablename__ = "tests"
    __table_args__ = {'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    description = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    access_code = Column(String(10), nullable=True)
    is_template = Column(Boolean, default=False)
    template_id = Column(Integer, ForeignKey("tests.id"), nullable=True)
    category = Column(String(100), nullable=True)
    is_student_only = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="tests")
    questions = relationship("Question", back_populates="test", cascade="all, delete-orphan")
    results = relationship("TestResult", back_populates="test", cascade="all, delete-orphan")
    template = relationship("Test", remote_side=[id], backref=backref("variations", lazy="dynamic"), foreign_keys=[template_id])

class Question(Base):
    __tablename__ = "questions"
    __table_args__ = {'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text)
    test_id = Column(Integer, ForeignKey("tests.id"))
    topic = Column(String(255), nullable=True)
    
    test = relationship("Test", back_populates="questions")
    options = relationship("Option", back_populates="question", cascade="all, delete-orphan")

class Option(Base):
    __tablename__ = "options"
    __table_args__ = {'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text)
    is_correct = Column(Boolean, default=False)
    question_id = Column(Integer, ForeignKey("questions.id"))
    
    question = relationship("Question", back_populates="options")

class TestResult(Base):
    __tablename__ = "results"
    __table_args__ = {'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"))
    user_name = Column(String(255))
    score = Column(Integer)
    max_score = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    answers = Column(JSON)
    question_times = Column(JSON, nullable=True)
    total_time = Column(Integer, nullable=True)
    original_test_id = Column(Integer, nullable=True)
    questions_snapshot = Column(JSON, nullable=True)
    
    test = relationship("Test", back_populates="results")

