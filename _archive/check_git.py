import subprocess
import os

def run_git_status():
    try:
        # Run git status in the repo directory
        cwd = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1"
        result = subprocess.run(["git", "status", "--porcelain"], cwd=cwd, capture_output=True, text=True)
        print(result.stdout)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_git_status()
