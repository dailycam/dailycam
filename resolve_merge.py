import subprocess
import os

def run_git_commands():
    try:
        # 1. git add
        print("Running git add...")
        subprocess.run(["git", "add", "frontend/src/components/layout/Sidebar.tsx"], check=True, cwd="C:/dev/dailycam-main")
        print("git add success")
        
        # 2. git commit
        print("Running git commit...")
        subprocess.run(["git", "commit", "-m", "Merge remote-tracking branch 'origin/dev': Resolve conflicts in Sidebar.tsx"], check=True, cwd="C:/dev/dailycam-main")
        print("git commit success")
        
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_git_commands()
