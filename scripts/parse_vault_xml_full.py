import xml.etree.ElementTree as ET
import json
import os
from pathlib import Path

XML_FILES = [
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/attachments/2024-06-22-all_Drive_Link_Export-metadata.xml",
    "/Volumes/batdrivetb5/MBOX_LOCKER_ISOLATE/2024-06-30_GMAIL_MBOX_LG_LOCKER/2024-06-30_GMAIL_LG_MBOX/attachments/2024-06-30_lg_Drive_Link_Export-metadata.xml",
    "/Volumes/batdrivetb5/MBOX_LOCKER_ISOLATE/2024-06-22_GMAIL_MBOX_LG_LOCKER_SEPARATE_EXPORT/2024-06-22_GMAIL_LG_MBOX_LOCKER_SEPARATE/attachments/2024-06-22-lg_Drive_Link_Export-metadata.xml",
    "/Volumes/batdrivetb5/MBOX_LOCKER_ISOLATE/2024-04-23_GMAIL_MBOX_LG_LOCKER/exported/lg240423_Drive_Link_Export-metadata.xml",
    "/Volumes/batdrivetb5/GDRIVE_LOCKER/2023-11-22_GDRIVE_LG_LOCKER/2023-11-22_GDRIVE_LG_ZIPPED/datach-metadata.xml",
    "/Volumes/batdrivetb5/GDRIVE_LOCKER/2023-11-22_GDRIVE_LG_LOCKER/2023-11-22_GDRIVE_LG_ZIPPED/112223-metadata.xml",
    "/Volumes/batdrivetb5/GDRIVE_LOCKER/2023-06-08_GDRIVE_SG_LOCKER/2023-06-08_GDRIVE_SG_ZIPPED/sgdrive-metadata.xml",
    "/Volumes/batdrivetb5/GDRIVE_LOCKER/2024-06-22_ALL_GDRIVE_DRIVE_LINK_LOCKER/ZIPPED/2024-06-22-all_Drive_Link_Export-metadata.xml"
]
OUTPUT_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/scripts/vault_mapping_full.json"

def parse_all_vault_xmls():
    mapping = {} # drive_item_id -> local_filename
    
    for xml_path in XML_FILES:
        if not os.path.exists(xml_path):
            print(f"Skipping {xml_path} (not found)")
            continue
            
        print(f"Parsing {xml_path}...")
        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()
            
            # Vault XML structure: <Documents><Document DocID="...">...<Files><File><ExternalFile FileName="...">
            for doc in root.findall(".//Document"):
                doc_id = doc.get('DocID')
                ext_file = doc.find(".//ExternalFile")
                if doc_id and ext_file is not None:
                    filename = ext_file.get('FileName')
                    mapping[doc_id] = filename
        except Exception as e:
            print(f"Error parsing {xml_path}: {e}")
            
    print(f"Found {len(mapping)} total unique mappings.")
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(mapping, f, indent=2)
    print(f"Saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    parse_all_vault_xmls()
