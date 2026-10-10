import os
import sys

# Ensure backend and root paths are available
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, "backend")

for p in [backend_dir, root_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.main import app

# Export for Vercel Serverless Function handler
__all__ = ["app"]
