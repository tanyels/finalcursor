import sqlite3
import os

def initialize_databases():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    data_dir = os.path.join(project_root, 'data')
    
    # Create data directory if it doesn't exist
    os.makedirs(data_dir, exist_ok=True)
    
    # Initialize stock database
    stock_conn = sqlite3.connect(os.path.join(data_dir, 'EKGYO.db'))
    stock_conn.execute('''
        CREATE TABLE IF NOT EXISTS prices (
            date TEXT PRIMARY KEY,
            Open REAL,
            High REAL,
            Low REAL,
            Close REAL,
            Volume INTEGER
        )
    ''')
    stock_conn.close()
    
    # Initialize USD/TRY database
    usd_conn = sqlite3.connect(os.path.join(data_dir, 'usd_try_rates.db'))
    usd_conn.execute('''
        CREATE TABLE IF NOT EXISTS rates (
            date TEXT PRIMARY KEY,
            rate REAL
        )
    ''')
    usd_conn.close()

if __name__ == "__main__":
    initialize_databases() 