import yfinance as yf
import sqlite3
import pandas as pd
import os
from datetime import datetime, timedelta
import requests

def initialize_stock_data(symbol, db_path):
    print(f"Initializing stock data for {symbol}...")
    
    # Fetch 1 year of historical data
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)
    
    # Fetch data from Yahoo Finance
    stock = yf.Ticker(f"{symbol}.IS")
    df = stock.history(start=start_date, end=end_date)
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    
    # Create table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS prices (
            date TEXT PRIMARY KEY,
            Open REAL,
            High REAL,
            Low REAL,
            Close REAL,
            Volume INTEGER
        )
    ''')
    
    # Prepare data for SQLite
    df.reset_index(inplace=True)
    df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
    
    # Insert data
    df.to_sql('prices', conn, if_exists='replace', index=False)
    
    print(f"Added {len(df)} days of historical stock data")
    conn.close()

def initialize_usd_try_rates(db_path):
    print("Initializing USD/TRY exchange rates...")
    API_KEY = os.environ.get('EXCHANGE_RATE_API_KEY')
    if not API_KEY:
        raise ValueError("EXCHANGE_RATE_API_KEY environment variable not set")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    
    # Create table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS rates (
            date TEXT PRIMARY KEY,
            rate REAL
        )
    ''')
    
    # Get last 365 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)
    
    dates = []
    current_date = start_date
    while current_date <= end_date:
        dates.append(current_date.strftime('%Y-%m-%d'))
        current_date += timedelta(days=1)
    
    rates_data = []
    total_dates = len(dates)
    
    print(f"Fetching {total_dates} days of exchange rate data...")
    for i, date in enumerate(dates, 1):
        print(f"Processing date {i}/{total_dates}: {date}", end='\r')
        url = f"https://v6.exchangerate-api.com/v6/{API_KEY}/history/USD/TRY/{date}"
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            rates_data.append({
                'date': date,
                'rate': data['conversion_rate']
            })
    
    df = pd.DataFrame(rates_data)
    df.to_sql('rates', conn, if_exists='replace', index=False)
    
    print(f"\nAdded {len(df)} days of historical exchange rate data")
    conn.close()

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    data_dir = os.path.join(project_root, 'data')
    
    # Create data directory if it doesn't exist
    os.makedirs(data_dir, exist_ok=True)
    
    # Initialize databases with historical data
    initialize_stock_data('EKGYO', os.path.join(data_dir, 'EKGYO.db'))
    initialize_usd_try_rates(os.path.join(data_dir, 'usd_try_rates.db'))
    
    print("\nInitialization complete!") 