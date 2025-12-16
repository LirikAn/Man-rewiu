from sqlalchemy import text
from database import engine

def add_questions_snapshot_column():
    with engine.begin() as connection:
        try:
            connection.execute(text("""
                ALTER TABLE results 
                ADD COLUMN questions_snapshot JSON NULL
            """))
            print("✓ Column 'questions_snapshot' added successfully to 'results' table")
        except Exception as e:
            if "Duplicate column" in str(e):
                print("✓ Column 'questions_snapshot' already exists")
            else:
                print(f"✗ Error: {e}")
                raise

if __name__ == "__main__":
    add_questions_snapshot_column()
