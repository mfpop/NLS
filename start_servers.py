"""Start backend and frontend dev servers."""
import subprocess
import sys
import os
import time
import signal
import atexit

BACKEND_DIR = os.path.join(os.path.dirname(__file__), "backend")
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

processes = []

def cleanup():
    for p in processes:
        try:
            p.terminate()
            p.wait(timeout=5)
        except Exception:
            pass
    print("\nServers stopped.")

atexit.register(cleanup)
signal.signal(signal.SIGINT, lambda s, f: sys.exit(0))
signal.signal(signal.SIGTERM, lambda s, f: sys.exit(0))

# Start backend
be = subprocess.Popen(
    [sys.executable, "manage.py", "runserver", "0.0.0.0:8000"],
    cwd=BACKEND_DIR,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
)
processes.append(be)

# Start frontend
fe = subprocess.Popen(
    ["npx", "vite", "--port", "5173", "--host", "0.0.0.0"],
    cwd=FRONTEND_DIR,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
)
processes.append(fe)

print("Starting servers...")
time.sleep(5)

# Check backend
be_poll = be.poll()
if be_poll is not None:
    print(f"Backend exited with code {be_poll}")
    print(be.stdout.read().decode() if be.stdout else "")
    sys.exit(1)
print("Backend server is running on http://localhost:8000")

# Check frontend
fe_poll = fe.poll()
if fe_poll is not None:
    print(f"Frontend exited with code {fe_poll}")
    print(fe.stdout.read().decode() if fe.stdout else "")
    sys.exit(1)
print("Frontend server is running on http://localhost:5173")

# Keep running until interrupted
print("\nPress Ctrl+C to stop both servers.")
try:
    while True:
        time.sleep(1)
        for p in processes:
            if p.poll() is not None:
                print(f"Process {p.args[0]} exited unexpectedly")
                print(p.stdout.read().decode() if p.stdout else "")
                sys.exit(1)
except KeyboardInterrupt:
    pass
