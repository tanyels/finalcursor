import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime
import os

# Get the script's directory
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)

# Connect to databases
stock_conn = sqlite3.connect(os.path.join(project_root, 'data', 'EKGYO.db'))
usd_conn = sqlite3.connect(os.path.join(project_root, 'data', 'usd_try_rates.db'))

# Read data into pandas dataframes
stock_df = pd.read_sql_query("SELECT * FROM prices", stock_conn)
usd_rates_df = pd.read_sql_query("SELECT * FROM rates", usd_conn)

# Make sure dates are in datetime format
stock_df['date'] = pd.to_datetime(stock_df['date'])
usd_rates_df['date'] = pd.to_datetime(usd_rates_df['date'])

# Merge stock data with USD rates based on date
merged_df = pd.merge(stock_df, usd_rates_df, on='date', how='inner')

# Convert TRY prices to USD
merged_df['price_usd'] = merged_df['Close'] / merged_df['rate']

# Create the graph
plt.figure(figsize=(12, 6))
plt.plot(merged_df['date'], merged_df['price_usd'])
plt.title('EKGYO Stock Price (USD)')
plt.xlabel('Date')
plt.ylabel('Price (USD)')
plt.grid(True)
plt.xticks(rotation=45)
plt.tight_layout()

# Create images directory if it doesn't exist
images_dir = os.path.join(project_root, 'images')
os.makedirs(images_dir, exist_ok=True)

# Save the graph
plt.savefig(os.path.join(images_dir, 'EKGYO_usd.png'))

# Close database connections
stock_conn.close()
usd_conn.close() 