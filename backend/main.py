from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
import jwt
import bcrypt
from datetime import datetime, timedelta
from pydantic import BaseModel
import sqlalchemy

from database import get_db, engine
import models
import schemas
from ai import classify_test_category, identify_math_topic, generate_test_variation

try:
    inspector = sqlalchemy.inspect(engine)
    if not inspector.has_table("users"):
        models.Base.metadata.create_all(bind=engine)
        print("Tables created successfully")
    else:
        print("Tables already exist, skipping creation")
except Exception as e:
    print(f"Error checking/creating tables: {str(e)}")

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/login", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register", response_model=schemas.UserResponse)
async def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/protected", response_model=schemas.UserResponse)
async def protected_route(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/tests", response_model=List[schemas.Test])
async def get_tests(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    tests = db.query(models.Test).filter(
        models.Test.user_id == current_user.id, 
        models.Test.is_student_only == False,
        models.Test.template_id == None
    ).all()
    return tests

@app.post("/tests", response_model=schemas.Test)
async def create_test(test: schemas.TestCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_test = models.Test(**test.dict(), user_id=current_user.id)
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    
    test_data = {
        "title": db_test.title,
        "description": db_test.description,
    }
    
    category = classify_test_category(test_data)
    
    if category:
        db_test.category = category[:100]
        db.commit()
        db.refresh(db_test)
    
    return db_test

@app.get("/tests/{test_id}", response_model=schemas.TestWithQuestions)
async def get_test(test_id: int, generate_new: bool = False, db: Session = Depends(get_db)):
    print(f"DEBUG:get_test called with test_id={test_id}, generate_new={generate_new}")
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if test is None:
        raise HTTPException(status_code=404, detail="Test not found")
    
    try:
        if not test.category or test.category != "Математика":
            test_data_for_cls = {
                "title": test.title,
                "description": test.description,
                "questions": [
                    {
                        "text": q.text,
                        "topic": q.topic,
                        "options": [
                            {"text": o.text, "is_correct": o.is_correct}
                            for o in q.options
                        ],
                    }
                    for q in test.questions
                ],
            }
            new_category = classify_test_category(test_data_for_cls)
            if new_category and new_category == "Математика":
                test.category = new_category[:100]
                db.commit()
                db.refresh(test)
    except Exception as _e:
        pass

    test_data = {
        "title": test.title,
        "description": test.description,
        "category": test.category,
        "questions": [
            {
                "text": q.text,
                "topic": q.topic,
                "options": [
                    {"text": o.text, "is_correct": o.is_correct}
                    for o in q.options
                ]
            }
            for q in test.questions
        ]
    }

    print(f"DEBUG:generating variant for template test_id={test.id}, category={test.category}")
    new_test_data = generate_test_variation(test_data)
    print("DEBUG:variant data prepared, creating DB rows")

    new_test = models.Test(
        title=new_test_data.get("title", f"{test.title} (Вариант)"),
        description=new_test_data.get("description", (test.description or "") + "\n(Автоматически сгенерированный вариант)"),
        category=new_test_data.get("category", test.category),
        user_id=test.user_id if hasattr(test, "user_id") else None,
        is_template=False,
        template_id=test.id,
        is_student_only=True
    )
    db.add(new_test)
    db.commit()
    db.refresh(new_test)

    for q_data in new_test_data.get("questions", []):
        question = models.Question(
            text=q_data.get("text", ""),
            topic=q_data.get("topic"),
            test_id=new_test.id
        )
        db.add(question)
        db.commit()
        db.refresh(question)

        for o_data in q_data.get("options", []):
            option = models.Option(
                text=o_data.get("text", ""),
                is_correct=o_data.get("is_correct", False),
                question_id=question.id
            )
            db.add(option)

    db.commit()
    db.refresh(new_test)
    print(f"DEBUG:variant created new_test_id={new_test.id} from template_id={test.id}")
    return new_test

@app.delete("/tests/{test_id}")
async def delete_test(test_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    test = db.query(models.Test).filter(models.Test.id == test_id, models.Test.user_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found or not authorized to delete this test")
    
    db.delete(test)
    db.commit()
    
    return {"message": "Test deleted successfully"}

@app.post("/test-results", response_model=schemas.TestResult)
async def create_test_result(test_result: schemas.TestResultCreate, db: Session = Depends(get_db)):
    try:
        test = db.query(models.Test).filter(models.Test.id == test_result.test_id).first()
        
        test_result_dict = test_result.dict()
        
        if test:
            questions = db.query(models.Question).filter(models.Question.test_id == test.id).all()
            questions_snapshot = []
            for q in questions:
                options = db.query(models.Option).filter(models.Option.question_id == q.id).all()
                questions_snapshot.append({
                    "id": q.id,
                    "text": q.text,
                    "topic": q.topic,
                    "options": [{"id": o.id, "text": o.text, "is_correct": o.is_correct} for o in options]
                })
            test_result_dict["questions_snapshot"] = questions_snapshot
        
        if test and test.template_id:
            test_result_dict["test_id"] = test.template_id
            test_result_dict["original_test_id"] = test.template_id
            print(f"Это вариация теста {test.id}, сохраняем с оригинальным ID: {test.template_id}")
        else:
            test_result_dict["original_test_id"] = test_result.test_id
            print(f"Это обычный тест {test_result.test_id}")
        
        db_test_result = models.TestResult(**test_result_dict)
        db.add(db_test_result)
        db.commit()
        db.refresh(db_test_result)
        
        print(f"Результат сохранён: ID={db_test_result.id}, test_id={db_test_result.test_id}, ученик={db_test_result.user_name}, баллы={db_test_result.score}/{db_test_result.max_score}")
        
        if test and test.template_id:
            db.delete(test)
            db.commit()
            print(f"Вариация теста {test.id} удалена")
        
        return db_test_result
    except Exception as e:
        print(f"Ошибка при сохранении результата: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving test result: {str(e)}")

@app.get("/test-results/test/{test_id}", response_model=List[schemas.TestResultWithQuestions])
async def get_test_results(test_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    print(f"\n=== Получение результатов для теста {test_id} ===")
    
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        print(f"Тест {test_id} не найден")
        raise HTTPException(status_code=404, detail="Test not found")
    
    results = db.query(models.TestResult).filter(
        models.TestResult.test_id == test_id
    ).all()
    
    print(f"Найдено {len(results)} результатов для теста {test_id}")
    for r in results:
        print(f"  - Результат {r.id}: ученик={r.user_name}, баллы={r.score}/{r.max_score}, has_snapshot={bool(r.questions_snapshot)}")
    
    questions = db.query(models.Question).filter(models.Question.test_id == test_id).all()
    print(f"Найдено {len(questions)} вопросов для теста {test_id}")
    
    results_with_questions = []
    for result in results:
        student_answers = result.answers if result.answers else {}
        print(f"  Результат {result.id}: raw answers = {student_answers}")
        
        if result.questions_snapshot:
            print(f"  Результат {result.id}: используем snapshot вопросов")
            questions_data = result.questions_snapshot
        else:
            print(f"  Результат {result.id}: загружаем вопросы из БД")
            questions_data = [
                {
                    "id": q.id,
                    "text": q.text,
                    "topic": q.topic,
                    "options": [{"id": o.id, "text": o.text, "is_correct": o.is_correct} for o in db.query(models.Option).filter(models.Option.question_id == q.id).all()]
                }
                for q in questions
            ]
        
        questions_with_answers = []
        
        for question_data in questions_data:
            question_id_str = str(question_data["id"])
            student_answer = student_answers.get(question_id_str)
            print(f"    Вопрос {question_id_str}: student_answer = {student_answer}")
            question_obj = {
                "id": question_data["id"],
                "text": question_data["text"],
                "options": question_data["options"],
                "student_answer": student_answer
            }
            
            questions_with_answers.append(question_obj)
        
        test_title = test.title if test else "Unknown Test"
        
        result_with_questions = {
            "id": result.id,
            "test_id": result.test_id,
            "original_test_id": result.original_test_id,
            "test_title": test_title,
            "user_name": result.user_name,
            "score": result.score,
            "max_score": result.max_score,
            "created_at": result.created_at,
            "total_time": result.total_time,
            "question_times": result.question_times,
            "questions_with_answers": questions_with_answers
        }
        
        results_with_questions.append(result_with_questions)
    
    print(f"Возвращаем {len(results_with_questions)} результатов\n")
    return results_with_questions

@app.post("/questions", response_model=schemas.Question)
async def create_question(question: schemas.QuestionCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    test = db.query(models.Test).filter(models.Test.id == question.test_id).first()
    if not test or test.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add questions to this test")
    
    topic = None
    if test.category == "Математика" or (not test.category and "математик" in question.text.lower()):
        topic = identify_math_topic(question.text)
    
    db_question = models.Question(
        text=question.text, 
        test_id=question.test_id,
        topic=topic
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    
    for option in question.options:
        db_option = models.Option(
            text=option.text,
            is_correct=option.is_correct,
            question_id=db_question.id
        )
        db.add(db_option)
    
    db.commit()
    db.refresh(db_question)
    
    questions = db.query(models.Question).filter(models.Question.test_id == test.id).all()
    
    if questions:
        test_data = {
            "title": test.title,
            "description": test.description,
            "questions": [
                {
                    "text": q.text,
                    "options": [{"text": o.text} for o in q.options]
                }
                for q in questions
            ]
        }
        
        category = classify_test_category(test_data)
        
        if category and (not test.category or test.category != category):
            test.category = category
            db.commit()
    
    return db_question

@app.post("/tests/{test_id}/generate-variation", response_model=schemas.TestWithQuestions)
async def generate_test_variation_endpoint(
    test_id: int, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    from ai import create_test_variation
    
    test = db.query(models.Test).filter(models.Test.id == test_id, models.Test.user_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found or not authorized to access this test")
    
    test.is_template = True
    db.commit()
    
    new_test_id = create_test_variation(
        source_test_id=test.id,
        new_test_title=f"{test.title} (Варіація)",
        user_id=current_user.id,
        session=db
    )
    
    if not new_test_id:
        raise HTTPException(status_code=500, detail="Failed to generate test variation")
    
    new_test = db.query(models.Test).filter(models.Test.id == new_test_id).first()
    if not new_test:
        raise HTTPException(status_code=500, detail="Generated test not found")
    
    return new_test

def generate_questions_for_variation(test_id: int, new_test_id: int, db: Session):
    original_test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not original_test:
        return
    
    test_data = {
        "title": original_test.title,
        "description": original_test.description,
        "category": original_test.category,
        "questions": [
            {
                "text": q.text,
                "topic": q.topic,
                "options": [
                    {"text": o.text, "is_correct": o.is_correct}
                    for o in q.options
                ]
            }
            for q in original_test.questions
        ]
    }
    
    new_test_data = generate_test_variation(test_data)
    
    for q_data in new_test_data["questions"]:
        question = models.Question(
            text=q_data["text"],
            topic=q_data["topic"],
            test_id=new_test_id
        )
        db.add(question)
        db.commit()
        db.refresh(question)
        
        for o_data in q_data["options"]:
            option = models.Option(
                text=o_data["text"],
                is_correct=o_data["is_correct"],
                question_id=question.id
            )
            db.add(option)
    
    db.commit()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

