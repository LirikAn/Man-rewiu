import os
import json
import re
import random
from typing import Dict, Any, Optional, List, Tuple
from threading import Semaphore
from dotenv import load_dotenv
import requests
from time import sleep

try:
    from database import SessionLocal
    from models import Question, Option, Test
    DB_AVAILABLE = True
except Exception as e:
    print(f"Warning: Database not available ({e}). Using fallback sample data.")
    DB_AVAILABLE = False
    SessionLocal = None
    Question = None
    Option = None
    Test = None

try:
    from zai import ZaiClient
except Exception:
    ZaiClient = None

load_dotenv()
ZAI_API_KEY = os.getenv("ZAI_API_KEY")
ZAI_MODEL = os.getenv("ZAI_MODEL", "glm-4.5-flash")
_zai_client = ZaiClient(api_key=ZAI_API_KEY) if (ZaiClient and ZAI_API_KEY) else None
_zai_semaphore = Semaphore(2)

def _zai_chat(messages: List[Dict[str, str]], temperature: float = 0.1, max_tokens: int = 512, thinking_enabled: bool = True) -> Optional[str]:
    if not _zai_client:
        print("DEBUG: ZAI client not configured")
        return None
    try:
        _zai_semaphore.acquire()
        response = _zai_client.chat.completions.create(
            model=ZAI_MODEL,
            messages=messages,
            thinking={"type": "enabled"} if thinking_enabled else {"type": "disabled"},
            max_tokens=max_tokens,
            temperature=temperature,
        )
        choices = getattr(response, "choices", None)
        if isinstance(choices, list) and choices:
            first = choices[0]
            if isinstance(first, dict):
                message = first.get("message")
            else:
                message = getattr(first, "message", None)
            if isinstance(message, dict):
                content = message.get("content")
            else:
                content = getattr(message, "content", None) if message is not None else None
            if isinstance(content, str):
                return content
        return None
    except Exception as e:
        print(f"DEBUG: ZAI request error: {e}")
        return None
    finally:
        try:
            _zai_semaphore.release()
        except Exception:
            pass

def _zai_request(messages: List[Dict[str, str]], temperature: float = 0.1, max_tokens: int = 512, thinking_enabled: bool = True) -> Optional[str]:
    if _zai_client:
        return _zai_chat(messages, temperature=temperature, max_tokens=max_tokens, thinking_enabled=thinking_enabled)
    api_key = ZAI_API_KEY
    if not api_key:
        print("DEBUG: No ZAI API key available for HTTP fallback")
        return None
    url = "https://api.z.ai/api/paas/v4/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": ZAI_MODEL,
        "thinking": {"type": "enabled"} if thinking_enabled else {"type": "disabled"},
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False
    }
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=60)
        r.raise_for_status()
        data = r.json()
        choices = data.get("choices") or []
        if isinstance(choices, list) and choices:
            first = choices[0]
            message = first.get("message") if isinstance(first, dict) else None
            if isinstance(message, dict):
                content = message.get("content")
            else:
                content = first.get("text") or data.get("text")
            if isinstance(content, str):
                return content
        return None
    except Exception as e:
        print(f"DEBUG: HTTP ZAI request error: {e}")
        return None

def _format_options_for_prompt(options: List) -> str:
    lines = []
    for i, opt in enumerate(options):
        lines.append(f"{chr(97+i)}) {opt.text}")
    return "\n".join(lines)

def save_generated_question(session, test_id: int, question_text: str, options: List[Dict[str, str]], topic: str) -> Optional[int]:
    try:
        new_question = Question(text=question_text, test_id=test_id, topic=topic)
        session.add(new_question)
        session.flush()
        
        for option_data in options:
            new_option = Option(text=option_data['text'], is_correct=option_data.get('is_correct', False), question_id=new_question.id)
            session.add(new_option)
        
        session.commit()
        return new_question.id
    except Exception as e:
        session.rollback()
        print(f"Error saving generated question: {e}")
        return None

def create_test_variation(source_test_id: int, new_test_title: Optional[str] = None, user_id: Optional[int] = None, session=None) -> Optional[int]:
    close_session = False
    try:
        if not DB_AVAILABLE:
            print("Database not available")
            return None
        
        if session is None:
            from database import SessionLocal
            session = SessionLocal()
            close_session = True
        
        source_test = session.get(Test, source_test_id)
        
        if not source_test:
            print(f"Test with ID {source_test_id} not found")
            return None
        
        new_test = Test(
            title=new_test_title or f"{source_test.title} (Generated Variation)",
            description=source_test.description,
            user_id=user_id or source_test.user_id,
            category=source_test.category,
            is_template=False,
            template_id=source_test_id
        )
        session.add(new_test)
        session.flush()
        
        source_questions = session.query(Question).filter(Question.test_id == source_test_id).all()
        
        for source_question in source_questions:
            options_list = session.query(Option).filter(Option.question_id == source_question.id).order_by(Option.id).all()
            
            payload_messages_topic = [
                {"role": "system", "content": "Ти експерт по математиці. Відповідай лише назвою теми."},
                {"role": "user", "content": f"Визнач **МАКСИМАЛЬНО КОНКРЕТНУ** тему з математики для наступного питання. Поверни **ЛИШЕ ОДНЕ СЛОВО** – назву цієї теми, без лапок, пояснень чи інших символів і відповідь на Українскій мові.\n\n\n\nПитання: {source_question.text}"}
            ]
            
            topic = _zai_request(payload_messages_topic, temperature=0.1, max_tokens=200, thinking_enabled=False)
            topic_text = topic.strip() if isinstance(topic, str) else (source_question.topic or "Математика")
            
            options_for_prompt = _format_options_for_prompt(options_list)
            correct_option = next(({"text": o.text, "is_correct": o.is_correct} for o in options_list if o.is_correct), None)
            
            prompt = f"""
Ти — експерт зі створення навчальних матеріалів з математики.
Твоє завдання: створити нове тестове завдання, яке є математично аналогічним (ізоморфним) до наданого зразка.
Випадкове число для різноманітності: {random.randint(1000, 9999)}
Вхідні дані:
- Тема: "{topic_text}"
- Зразок питання: {source_question.text}
- Зразок варіантів:
{options_for_prompt}
- Зразок правильної відповіді: {correct_option['text'] if correct_option else 'Правильна відповідь відсутня'}
Інструкції:
1. Тема та Концепція: Нове питання має СТРОГО відповідати темі "{topic_text}" та перевіряти ТУ ЖЕ математичну навичку.
2. Складність: СТРОГО ДОТРИМУЙ рівень складності оригіналу. Якщо оригіналь простий - генеруй простий. Не роби складнішим!
3. Числовий діапазон: Використовуй числа ПОДІБНОГО розміру до оригіналу. Якщо там однозначні числа - генеруй однозначні.
4. Зміни: Змінюй тільки конкретні числа та wording, але ЗБЕРІГАЙ структуру та складність.
5. Варіанти відповідей:
    - Згенеруй 4 варіанти відповіді (марковані як a, b, c, d).
    - Тільки один варіант правильний.
    - Позиція правильної відповіді ВИПАДКОВА (a, b, c або d).
    - Неправильні варіанти мають бути реалістичними помилками.
Формат виводу:
ПИТАННЯ: [Текст нового питання]
a) [Варіант A]
b) [Варіант B]
c) [Варіант C]
d) [Варіант D]
ПРАВИЛЬНА: [Тільки буква]
"""
            
            payload_messages_task = [
                {"role": "system", "content": "Ти експерт зі створення навчальних матеріалів з математики."},
                {"role": "user", "content": prompt}
            ]
            
            task_output = _zai_request(payload_messages_task, temperature=0.7, max_tokens=800, thinking_enabled=False)
            
            if task_output:
                parsed = _parse_task_output(task_output)
                if parsed:
                    save_generated_question(session, new_test.id, parsed['question'], parsed['options'], topic_text)
                    print(f"Generated question: {parsed['question'][:50]}...")
            
            sleep(1)
        
        session.commit()
        print(f"\nNew test created with ID: {new_test.id}")
        return new_test.id
        
    except Exception as e:
        session.rollback()
        print(f"Error creating test variation: {e}")
        return None
    finally:
        if close_session and session:
            session.close()

def generate_for_question(question_id: Optional[int] = None, test_id: Optional[int] = None, save_to_db: bool = True) -> Optional[str]:
    session = None
    try:
        if not DB_AVAILABLE:
            question = None
        else:
            session = SessionLocal()
            question = None
            if question_id is not None:
                question = session.get(Question, question_id)
            if question is None:
                question = session.query(Question).first()
        if question is None:
            sample_text = "Винесіть за дужки спільний множник 12x^2 * y + 6x^2"
            sample_options = [
                {"text": "6x^2(2y+x)", "is_correct": False},
                {"text": "6x^2(2+xy)", "is_correct": False},
                {"text": "6x^2(6y+1)", "is_correct": False},
                {"text": "6x^2(2y+1)", "is_correct": True},
            ]
            question_text = sample_text
            options_for_prompt = "\n".join([f"{chr(97+i)}) {o['text']}" for i, o in enumerate(sample_options)])
            correct_option = next((o for o in sample_options if o["is_correct"]), None)
        else:
            question_text = question.text
            options_list = session.query(Option).filter(Option.question_id == question.id).order_by(Option.id).all()
            options_for_prompt = _format_options_for_prompt(options_list)
            correct_option = next(({"text": o.text, "is_correct": o.is_correct} for o in options_list if o.is_correct), None)
        payload_messages_topic = [
            {"role": "system", "content": "Ти експерт по математиці. Відповідай лише назвою теми."},
            {"role": "user", "content": f"Визнач **МАКСИМАЛЬНО КОНКРЕТНУ** тему з математики для наступного питання. Поверни **ЛИШЕ ОДНЕ СЛОВО** – назву цієї теми, без лапок, пояснень чи інших символів і відповідь на Українскій мові.\n\n\n\nПитання: {question_text}"}
        ]
        topic = _zai_request(payload_messages_topic, temperature=0.1, max_tokens=200, thinking_enabled=False)
        topic_text = topic.strip() if isinstance(topic, str) else (question.topic if question else "Математика")
        print(f"Detected topic: {topic_text}\n")
        sleep(1)
        prompt = f"""
Ти — експерт зі створення навчальних матеріалів з математики.
Твоє завдання: створити нове тестове завдання, яке є математично аналогічним (ізоморфним) до наданого зразка.
Випадкове число для різноманітності: {random.randint(1000, 9999)}
Вхідні дані:
- Тема: "{topic_text}"
- Зразок питання: {question_text}
- Зразок варіантів:
{options_for_prompt if options_for_prompt else 'Варіанти відсутні'}
- Зразок правильної відповіді: {correct_option['text'] if correct_option else 'Правильна відповідь відсутня'}
Інструкції:
1. Тема та Концепція: Нове питання має СТРОГО відповідати темі "{topic_text}" та перевіряти ТУ ЖЕ математичну навичку.
2. Складність: СТРОГО ДОТРИМУЙ рівень складності оригіналу. Якщо оригіналь простий - генеруй простий. Не роби складнішим!
3. Числовий діапазон: Використовуй числа ПОДІБНОГО розміру до оригіналу. Якщо там однозначні числа - генеруй однозначні.
4. Зміни: Змінюй тільки конкретні числа та wording, але ЗБЕРІГАЙ структуру та складність.
5. Варіанти відповідей:
    - Згенеруй 4 варіанти відповіді (марковані як a, b, c, d).
    - Тільки один варіант правильний.
    - Позиція правильної відповіді ВИПАДКОВА (a, b, c або d).
    - Неправильні варіанти мають бути реалістичними помилками.
Формат виводу:
ПИТАННЯ: [Текст нового питання]
a) [Варіант A]
b) [Варіант B]
c) [Варіант C]
d) [Варіант D]
ПРАВИЛЬНА: [Тільки буква]
"""
        payload_messages_task = [
            {"role": "system", "content": "Ти експерт зі створення навчальних матеріалів з математики."},
            {"role": "user", "content": prompt}
        ]
        task_output = _zai_request(payload_messages_task, temperature=0.7, max_tokens=800, thinking_enabled=False)
        if task_output:
            print(task_output)
            if save_to_db and test_id is not None and DB_AVAILABLE and session:
                parsed_question = _parse_task_output(task_output)
                if parsed_question:
                    saved_id = save_generated_question(session, test_id, parsed_question['question'], parsed_question['options'], topic_text)
                    if saved_id:
                        print(f"\nQuestion saved to database with ID: {saved_id}")
            return task_output
        return None
    except Exception as e:
        print(f"Error in generate_for_question: {e}")
        return None
    finally:
        try:
            if session:
                session.close()
        except Exception:
            pass

def _parse_task_output(output: str) -> Optional[Dict[str, Any]]:
    try:
        q_match = re.search(r"ПИТАННЯ:\s*(.*?)(?:\n[a-d]\)|\n\n|$)", output, flags=re.S | re.I)
        question_text = q_match.group(1).strip() if q_match else None
        if not question_text:
            return None
        
        option_tuples = re.findall(r"^[ \t]*([a-dA-D])\)\s*(.+)$", output, flags=re.M)
        options = []
        for letter, text in option_tuples:
            options.append({"text": text.strip(), "is_correct": False})
        
        corr = re.search(r"ПРАВИЛЬНА:\s*([a-dA-D])", output, flags=re.I)
        if corr and options:
            correct_letter = corr.group(1).lower()
            for idx, opt in enumerate(options):
                if chr(97 + idx) == correct_letter:
                    opt['is_correct'] = True
        
        if not options:
            return None
        
        return {"question": question_text, "options": options}
    except Exception as e:
        print(f"Error parsing task output: {e}")
        return None

def _sanitize_category(raw: str) -> Optional[str]:
    if not raw:
        return None
    text = raw.strip()
    text = text.replace('"', '').replace("'", "")
    text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    first_line = next((ln.strip() for ln in text.splitlines() if ln.strip()), "")
    if ":" in first_line:
        first_line = first_line.split(":", 1)[0].strip()
    low = first_line.lower()
    mapping = {
        "матем": "Математика",
        "истор": "История",
        "болог": "Биология",
        "хим": "Химия",
        "физ": "Физика",
        "мов": "Мовы",
        "язык": "Языки",
        "литера": "Литература",
        "географ": "География",
        "інформ": "Інформатика",
        "информ": "Информатика",
    }
    for key, val in mapping.items():
        if key in low:
            return val
    cleaned = re.sub(r"[^\w\s\-А-Яа-яЁёІіЇїЄєҐґ]", "", first_line).strip()
    if not cleaned:
        return None
    return cleaned[:100]

def classify_test_category(test_data: Dict[str, Any]) -> Optional[str]:
    try:
        test_content = f"Назва тесту: {test_data.get('title','')}\n"
        if test_data.get('description'):
            test_content += f"Опис: {test_data.get('description','')}\n"
        if 'questions' in test_data and test_data['questions']:
            test_content += "Питання:\n"
            for i, q in enumerate(test_data['questions']):
                test_content += f"{i+1}. {q.get('text','')}\n"
        prompt = (
            "Визнач МАКСИМАЛЬНО КОНКРЕТНУ тему з математики для наступного питання.\n"
            "Поверни ЛИШЕ ОДНЕ СЛОВО — назву цієї теми українською без пояснень.\n"
            f"Тест для аналізу:\n{test_content}\n"
        )
        raw = _zai_chat([
            {"role": "system", "content": "Ти експерт по математиці. Відповідай лише назвою теми."},
            {"role": "user", "content": prompt}
        ], temperature=0.1, max_tokens=50)
        return _sanitize_category(raw or "")
    except Exception as e:
        print(f"Ошибка классификации теста: {e}")
        return None

def identify_math_topic(text: str) -> str:
    if not text:
        return "Математика"
    low = text.lower()
    keywords = {
        "алгебр": "Алгебра",
        "логарифм": "Алгебра",
        "куб": "Геометрия",
        "квадрат": "Геометрия",
        "треугол": "Геометрия",
        "периметр": "Геометрия",
        "площад": "Геометрия",
        "дериват": "Аналіз",
        "процент": "Арифметика",
        "дроб": "Арифметика",
        "корен": "Алгебра",
    }
    for k, v in keywords.items():
        if k in low:
            return v
    return "Математика"

def generate_similar_question(question_text: str, topic: str, options: List[Dict[str, Any]]) -> Tuple[str, List[Dict[str, Any]]]:
    try:
        correct_option = next((opt.get('text') for opt in options if opt.get('is_correct')), None)
        options_text = "\n".join([f"{chr(97+i)}) {opt.get('text','')}" for i, opt in enumerate(options)])
        prompt = f"Пожалуйста, сгенерируй похожий вопрос по теме '{topic}'.\nВопрос: {question_text}\nВарианты:\n{options_text}\nФормат вывода:\nПИТАННЯ: ...\na) ...\nb) ...\nc) ...\nd) ...\nПРАВИЛЬНА: [буква]"
        raw = _zai_chat([
            {"role": "system", "content": "Ты помощник по генерации учебных вопросов. Следуй формату."},
            {"role": "user", "content": prompt}
        ], temperature=0.7, max_tokens=500)
        resp = raw or ""
        q_match = re.search(r"ПИТАННЯ:\s*(.*?)(?:\n[a-d]\)|\n\n|$)", resp, flags=re.S | re.I)
        question_part = q_match.group(1).strip() if q_match else question_text
        option_tuples = re.findall(r"^[ \t]*([a-dA-D])\)\s*(.+)$", resp, flags=re.M)
        parsed_options: List[Dict[str, Any]] = []
        for letter, text in option_tuples:
            parsed_options.append({"text": text.strip(), "is_correct": False})
        corr = re.search(r"ПРАВИЛЬНА:\s*([a-dA-D])", resp, flags=re.I)
        if corr and parsed_options:
            correct_letter = corr.group(1).lower()
            for idx, opt in enumerate(parsed_options):
                if chr(97 + idx) == correct_letter:
                    opt['is_correct'] = True
        if not parsed_options:
            parsed_options = [{"text": o.get('text',''), "is_correct": o.get('is_correct', False)} for o in options]
        return question_part, parsed_options
    except Exception as e:
        print(f"Ошибка генерации похожего вопроса: {e}")
        return question_text, [{"text": o.get('text',''), "is_correct": o.get('is_correct', False)} for o in options]

def generate_test_variation(test_data: Dict[str, Any]) -> Dict[str, Any]:
    description = test_data.get('description', '') or ''
    new_test = {
        "title": f"{test_data.get('title','(без назви)')} (Вариант)",
        "description": description + "\n(Автоматически сгенерированный вариант)",
        "category": test_data.get('category', ''),
        "questions": []
    }
    for q in test_data.get('questions', []):
        text = q.get('text', '')
        topic = q.get('topic') or identify_math_topic(text)
        new_q_text, new_options = generate_similar_question(text, topic, q.get('options', []))
        new_test['questions'].append({
            'text': new_q_text,
            'topic': topic,
            'options': new_options
        })
    return new_test

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Generate variation for single question: python ai.py question <question_id> <test_id>")
        print("  Generate entire test variation: python ai.py test <source_test_id> [new_test_title] [user_id]")
        sys.exit(1)
    
    mode = sys.argv[1].lower()
    
    if mode == 'question':
        qid = None
        tid = None
        if len(sys.argv) > 2:
            try:
                qid = int(sys.argv[2])
            except Exception:
                qid = None
        if len(sys.argv) > 3:
            try:
                tid = int(sys.argv[3])
            except Exception:
                tid = None
        generate_for_question(qid, tid, save_to_db=True)
    
    elif mode == 'test':
        if len(sys.argv) < 3:
            print("Error: test mode requires source_test_id")
            sys.exit(1)
        
        try:
            source_test_id = int(sys.argv[2])
        except Exception:
            print("Error: source_test_id must be an integer")
            sys.exit(1)
        
        new_title = sys.argv[3] if len(sys.argv) > 3 else None
        user_id = None
        if len(sys.argv) > 4:
            try:
                user_id = int(sys.argv[4])
            except Exception:
                user_id = None
        
        create_test_variation(source_test_id, new_title, user_id)
    
    else:
        print(f"Unknown mode: {mode}")
        sys.exit(1)