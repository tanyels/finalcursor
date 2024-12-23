import yfinance as yf
import sqlite3
import pandas as pd
import os
from datetime import datetime, timedelta
import requests

def update_stock_data(symbol, db_path):
    # Get yesterday's date (since today's data might not be available yet)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=5)  # Fetch last 5 days to ensure we don't miss any data
    
    # Fetch data from Yahoo Finance
    stock = yf.Ticker(f"{symbol}.IS")  # .IS for Istanbul stock exchange
    df = stock.history(start=start_date, end=end_date)
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    
    # Create table if it doesn't exist
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
    
    # Get the last date in our database
    last_date = pd.read_sql("SELECT MAX(date) as max_date FROM prices", conn)['max_date'].iloc[0]
    
    if last_date:
        last_date = pd.to_datetime(last_date)
        # Filter only new data
        df = df[df.index > last_date]
    
    if not df.empty:
        # Prepare data for SQLite
        df.reset_index(inplace=True)
        df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
        
        # Insert new data
        df.to_sql('prices', conn, if_exists='append', index=False)
    
    conn.close()

def update_usd_try_rate(db_path):
    # Using exchangerate-api.com
    API_KEY = os.environ.get('EXCHANGE_RATE_API_KEY')
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    
    # Create table if it doesn't exist
    conn.execute('''
        CREATE TABLE IF NOT EXISTS rates (
            date TEXT PRIMARY KEY,
            rate REAL
        )
    ''')
    
    # Get the last date in our database
    last_date = pd.read_sql("SELECT MAX(date) as max_date FROM rates", conn)['max_date'].iloc[0]
    
    if last_date:
        start_date = datetime.strptime(last_date, '%Y-%m-%d') + timedelta(days=1)
    else:
        start_date = datetime.now() - timedelta(days=365)  # If no data, get last year
    
    # Get dates to fetch
    end_date = datetime.now()
    dates = []
    current_date = start_date
    while current_date <= end_date:
        dates.append(current_date.strftime('%Y-%m-%d'))
        current_date += timedelta(days=1)
    
    # Fetch and store new rates
    rates_data = []
    for date in dates:
        url = f"https://v6.exchangerate-api.com/v6/{API_KEY}/history/USD/TRY/{date}"
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            rates_data.append({
                'date': date,
                'rate': data['conversion_rate']
            })
    
    if rates_data:
        df = pd.DataFrame(rates_data)
        df.to_sql('rates', conn, if_exists='append', index=False)
    
    conn.close()

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    data_dir = os.path.join(project_root, 'data')
    
    # Create data directory if it doesn't exist
    os.makedirs(data_dir, exist_ok=True)
    
    # Update stock data
    update_stock_data('EKGYO', os.path.join(data_dir, 'EKGYO.db'))
    
    # Update USD/TRY rates
    update_usd_try_rate(os.path.join(data_dir, 'usd_try_rates.db'))