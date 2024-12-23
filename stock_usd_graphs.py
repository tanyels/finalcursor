import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime

# Connect to databases
stock_conn = sqlite3.connect('EKGYO.db')
usd_conn = sqlite3.connect('usd_try_rates.db')

# Read data into pandas dataframes
stock_df = pd.read_sql_query("SELECT * FROM your_table_name", stock_conn)
usd_rates_df = pd.read_sql_query("SELECT * FROM your_table_name", usd_conn)

# Make sure dates are in datetime format
stock_df['date'] = pd.to_datetime(stock_df['date'])
usd_rates_df['date'] = pd.to_datetime(usd_rates_df['date'])

# Merge stock data with USD rates based on date
merged_df = pd.merge(stock_df, usd_rates_df, on='date', how='inner')

# Convert TRY prices to USD
# Assuming your price column is named 'close' and exchange rate column is 'rate'
merged_df['price_usd'] = merged_df['close'] / merged_df['rate']

# Create the graph
plt.figure(figsize=(12, 6))
plt.plot(merged_df['date'], merged_df['price_usd'])
plt.title('EKGYO Stock Price (USD)')
plt.xlabel('Date')
plt.ylabel('Price (USD)')
plt.grid(True)
plt.xticks(rotation=45)
plt.tight_layout()

# Save the graph
plt.savefig('EKGYO_usd.png')

# Close database connections
stock_conn.close()
usd_conn.close() 