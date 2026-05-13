# Launchd Home Folder Relocation Report

Timestamp: 2026-05-10 14:46:31 CDT
Workspace boundary: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER

Scope approved by Joseph:
- /Users/iseepatterns-ms-m4/bin
- /Users/iseepatterns-ms-m4/Library/Logs

Destination:
/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/_relocated_from_home/2026-05-10_14-40-11_launchd_folders

Actions completed:
- Moved /Users/iseepatterns-ms-m4/bin into the Locker destination.
- Copied /Users/iseepatterns-ms-m4/Library/Logs into the Locker destination.
- Attempted to remove /Users/iseepatterns-ms-m4/Library/Logs after copy; macOS returned PermissionError(13, 'Permission denied') on the source directory rmdir.
- Updated Locker launchd plist HOME values to /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER.
- Verified the two modified launchd plist files parse with plutil.
- Verified /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1-cluster/launchd contains zero /Users/iseepatterns-ms-m4 references.

Modified files:
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1-cluster/launchd/iseepatterns-ms-m4/com.lawmodel1.caddy.plist
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1-cluster/launchd/iseepatterns-ms-m4/com.lawmodel1.memo.plist

Relocation manifests:
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/_relocated_from_home/2026-05-10_14-40-11_launchd_folders/_relocation_manifest.json
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/_relocated_from_home/2026-05-10_14-40-11_launchd_folders/_relocation_manifest.csv
- /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/_relocated_from_home/2026-05-10_14-40-11_launchd_folders/_reference_update_report.json

Verification counts:
- bin source exists after relocation: false
- bin destination exists: true
- Logs source exists after relocation: true
- Logs destination exists: true
- Destination bin: 7 files, 1 directories, tree_sha256 c92eb4222b1db1be946af02d67c928b44b3efa0f8dbdaf6fe8dd3fa0f2fb9a52
- Destination Logs: 431 files, 78 directories, tree_sha256 d75a377984324896c9deb7c060a8f8855212c0c371c8a8bf76294197cd3354c0
- Locker launchd /Users/iseepatterns-ms-m4 references: 0

Open item:
- /Users/iseepatterns-ms-m4/Library/Logs remains as a source directory because macOS denied rmdir. Contents were copied into the Locker destination before the removal attempt.
