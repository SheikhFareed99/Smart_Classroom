import sys
import traceback

try:
    import uvicorn
    from main import app
    print("Import OK, starting server...")
except Exception as e:
    traceback.print_exc()
    sys.exit(1)
