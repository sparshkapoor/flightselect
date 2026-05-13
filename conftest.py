import sys
from pathlib import Path

# Make the repo root importable so `import rag` works from any pytest invocation
sys.path.insert(0, str(Path(__file__).parent))
