import pandas as pd
import sys

def analyze_draws(csv_path):
    print(f"Loading {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # Filter for draws in Type2
    draws = df[df['Type2'].str.contains('DRAW', na=False, case=False)].copy()
    
    # Needs Date parsing
    draws['Date'] = pd.to_datetime(draws['Date'], errors='coerce')
    draws['Year'] = draws['Date'].dt.year
    draws['Month'] = draws['Date'].dt.month
    
    # Ensure amount is numeric (handle strings with commas/dollar signs if present)
    if draws['Amount'].dtype == 'object':
        draws['Amount'] = draws['Amount'].replace({'\$': '', ',': ''}, regex=True).astype(float)
        
    # Group by Year and Type2 (which contains the person drawing, JZ DRAW or LG DRAW)
    summary = draws.groupby(['Year', 'Type2'])['Amount'].sum().reset_index()
    print("\n--- Annual Draw Summaries ---")
    print(summary.to_string(index=False))
    
    # Analyze December draws specifically for equalization
    december_draws = draws[draws['Month'] == 12].copy()
    
    print("\n--- December Draws (Potential Equalization) ---")
    dec_summary = december_draws.groupby(['Year', 'Type2'])['Amount'].sum().reset_index()
    print(dec_summary.to_string(index=False))
    
    print("\n--- All December Draw Transactions ---")
    dec_txns = december_draws[['Date', 'Type2', 'Description', 'Amount']].sort_values(['Date'])
    print(dec_txns.to_string(index=False))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_draws.py <path_to_csv>")
        sys.exit(1)
    analyze_draws(sys.argv[1])
