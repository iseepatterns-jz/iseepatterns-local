import zipfile
import re
import os
import csv
import glob

def extract_email(filename):
    # Pattern to match the email address in filenames like:
    # 2024-06-22-all--jay@rowboatcreative.com-klAviG.mbox
    match = re.search(r'--([a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+)-', filename)
    if match:
        return match.group(1)
    return None

def main():
    base_dir = '/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/'
    output_file = os.path.join(base_dir, 'mbox_accounts_mapping.csv')
    
    zip_files = glob.glob(os.path.join(base_dir, '2024-06-22-all-*.zip'))
    # Sort files to ensure 1, 2, 3... 10 order
    zip_files.sort(key=lambda x: [int(c) if c.isdigit() else c for c in re.split(r'(\d+)', x)])
    
    results = []
    
    for zip_path in zip_files:
        zip_name = os.path.basename(zip_path)
        try:
            with zipfile.ZipFile(zip_path, 'r') as z:
                # Find the mbox file inside
                mbox_files = [f for f in z.namelist() if f.endswith('.mbox')]
                if mbox_files:
                    # Usually there's only one, but we'll take the first or all
                    for mbox_file in mbox_files:
                        email = extract_email(mbox_file)
                        if email:
                            results.append({'zip_file': zip_name, 'email_account': email})
                        else:
                            results.append({'zip_file': zip_name, 'email_account': 'COULD_NOT_EXTRACT'})
                else:
                    results.append({'zip_file': zip_name, 'email_account': 'NO_MBOX_FOUND'})
        except Exception as e:
            results.append({'zip_file': zip_name, 'email_account': f'ERROR: {str(e)}'})

    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['zip_file', 'email_account'])
        writer.writeheader()
        writer.writerows(results)
    
    print(f"Extraction complete. Results saved to {output_file}")
    print(f"Total entries: {len(results)}")

if __name__ == "__main__":
    main()
