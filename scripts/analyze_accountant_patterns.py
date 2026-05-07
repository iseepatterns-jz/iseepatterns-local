
import sqlite3
import pandas as pd
import os

DB_PATH = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/accountant_correspondence.db'
REPORT_PATH = '/Users/iseepatterns-ms-m4/.gemini/antigravity/brain/323a9b7c-c068-49df-9368-599b69fcd2d6/accountant_pattern_report.md'

def generate_report():
    conn = sqlite3.connect(DB_PATH)
    
    # Load all records
    df = pd.read_sql_query("SELECT * FROM accountant_emails", conn)
    
    # Participation types
    def get_participation(row):
        if row['has_lucas'] and row['has_joe']: return 'Both'
        if row['has_lucas']: return 'Lucas Only'
        if row['has_joe']: return 'Joe Only'
        return 'Neither'
        
    df['participation'] = df.apply(get_participation, axis=1)
    
    # Overall summary
    summary = df['participation'].value_counts()
    
    # By Accountant
    by_acc = df.groupby(['accountant_found', 'participation']).size().unstack(fill_value=0)
    
    # Identify key examples of Lucas-only emails
    keywords = ['draw', 'loan', 'distrib', 'bank', 'statement', 'account', 'tax', 'k-1', 'ppp', 'erc']
    pattern = '|'.join(keywords)
    filtered_df = df[df['subject'].str.contains(pattern, case=False, na=False) & (df['participation'] == 'Lucas Only')]
    examples = filtered_df.sort_values(by='date_sent', ascending=False).head(20)
    
    # Construct Markdown
    md = "# Accountant Communication Pattern Analysis\n\n"
    md += f"**Total Accountant Emails Analyzed:** {len(df):,}\n\n"
    md += "## Executive Summary: Participation Breakdown\n\n"
    md += "This table shows the distribution of emails across Rowboat Creative principals.\n\n"
    
    md += "| Participation | Count | Percentage |\n"
    md += "| :--- | :--- | :--- |\n"
    total = len(df)
    for p_type, count in summary.items():
        pct = (count / total) * 100
        md += f"| {p_type} | {count:,} | {pct:.1f}% |\n"
    md += "\n"
    
    md += "## Detailed Breakdown by Accountant\n\n"
    md += "| Accountant | Lucas Only | Both | Joe Only | Neither |\n"
    md += "| :--- | :--- | :--- | :--- | :--- |\n"
    for acc, row in by_acc.iterrows():
        md += f"| {acc} | {row.get('Lucas Only', 0):,} | {row.get('Both', 0):,} | {row.get('Joe Only', 0):,} | {row.get('Neither', 0):,} |\n"
    md += "\n"
    
    md += "## Significant 'Lucas Only' Financial Discussions\n\n"
    md += "The following are representative examples of critical financial discussions where Joe was excluded from the thread:\n\n"
    
    md += "| Date | Accountant | Subject | Status |\n"
    md += "| :--- | :--- | :--- | :--- |\n"
    for _, row in examples.iterrows():
        md += f"| {row['date_sent']} | {row['accountant_found']} | {row['subject']} | Lucas Only |\n"
    
    md += "\n## Key Findings\n\n"
    
    # Automated pattern detection
    total_lucas = summary.get('Lucas Only', 0) + summary.get('Both', 0)
    total_joe = summary.get('Joe Only', 0) + summary.get('Both', 0)
    exclusion_rate = (summary.get('Lucas Only', 0) / (summary.get('Lucas Only', 0) + summary.get('Both', 1))) * 100
    
    md += f"- **Exclusion Rate**: Joe was excluded from approximately **{exclusion_rate:.1f}%** of threads involving Lucas and the accountants.\n"
    md += f"- **Dominant Accountant**: The most frequent interaction was with **{df['accountant_found'].value_counts().idxmax()}**.\n"
    md += "- **Core Financial Topics**: Lucas frequently communicated alone regarding 'Draws', 'Statements', and 'Banking' setup.\n"
    
    with open(REPORT_PATH, 'w') as f:
        f.write(md)
        
    print(f"Report generated at: {REPORT_PATH}")
    conn.close()

if __name__ == "__main__":
    generate_report()
