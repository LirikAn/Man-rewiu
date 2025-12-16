from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        orm_mode = True

class OptionBase(BaseModel):
    text: str
    is_correct: bool

class OptionCreate(OptionBase):
    pass

class Option(OptionBase):
    id: int
    question_id: int

    class Config:
        orm_mode = True

class QuestionBase(BaseModel):
    text: str
    topic: Optional[str] = None

class QuestionCreate(QuestionBase):
    test_id: int
    options: List[OptionCreate]

class Question(QuestionBase):
    id: int
    test_id: int
    options: List[Option]

    class Config:
        orm_mode = True

# Test schemas
class TestBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_template: Optional[bool] = False
    template_id: Optional[int] = None
    is_student_only: Optional[bool] = False

class TestCreate(TestBase):
    pass

class Test(TestBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True

class TestWithQuestions(Test):
    questions: List[Question]

    class Config:
        orm_mode = True

class TestResultBase(BaseModel):
    test_id: int
    user_name: str
    score: int
    max_score: int
    total_time: Optional[int] = None
    question_times: Optional[Dict[str, int]] = None
    answers: Optional[Dict[str, Any]] = None
    original_test_id: Optional[int] = None
    questions_snapshot: Optional[Dict[str, Any]] = None

class TestResultCreate(TestResultBase):
    pass

class TestResult(TestResultBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class QuestionWithStudentAnswer(Question):
    student_answer: Optional[Any] = None

class TestResultWithQuestions(TestResult):
    questions_with_answers: List[Dict[str, Any]]
    test_title: Optional[str] = None
    is_variation: Optional[bool] = False

    class Config:
        orm_mode = True

