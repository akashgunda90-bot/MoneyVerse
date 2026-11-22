import os
import sys

# Ensure backend directory is in sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.abspath(os.path.join(_current_dir, "..", "moneyverse_2.0", "backend"))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from main import app
