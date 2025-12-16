from database import SessionLocal
import models

db = SessionLocal()

results = db.query(models.TestResult).all()
print(f'Найдено {len(results)} результатов тестов')

tests = {t.id: t for t in db.query(models.Test).all()}
print(f'Загружено {len(tests)} тестов')

updated = 0

for r in results:
    test = tests.get(r.test_id)
    
    if test and test.template_id:
        r.original_test_id = test.template_id
        print(f'Результат ID {r.id}: test_id={r.test_id}, original_test_id={test.template_id} (вариация)')
        updated += 1
    else:
        r.original_test_id = r.test_id
        print(f'Результат ID {r.id}: test_id={r.test_id}, original_test_id={r.test_id} (оригинал)')
    
    db.add(r)

db.commit()

print(f'Обновлено {updated} результатов вариативных тестов из {len(results)} всего')
print('Все результаты успешно обновлены!') 