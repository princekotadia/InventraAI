import sqlite3
import sys
import os

# Add parent dir to path so we can import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import DATABASE_URL

def ensure_sqlite_column(db_path, table, column, col_type='DATE'):
    if not os.path.exists(db_path.replace('sqlite:///', '')):
        print('DB file not found, skipping schema check')
        return
    conn = sqlite3.connect(db_path.replace('sqlite:///', ''))
    cur = conn.cursor()
    cur.execute(f"PRAGMA table_info({table})")
    cols = [r[1] for r in cur.fetchall()]
    if column in cols:
        print(f"Column {column} already exists in {table}")
    else:
        try:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
            conn.commit()
            print(f"Added column {column} to {table}")
        except Exception as e:
            print('Failed to add column:', e)
    conn.close()

if __name__ == '__main__':
    # Only handle sqlite default URL
    if DATABASE_URL.startswith('sqlite:///'):
        dbpath = DATABASE_URL
        ensure_sqlite_column(dbpath, 'products', 'expiry_date', 'DATE')
    else:
        print('Non-sqlite DB detected; ensure your migrations run separately')
