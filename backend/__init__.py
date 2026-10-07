import sys
import pathlib

# Resolve the UI backend directory relative to the project root.
_project_root = pathlib.Path(__file__).resolve().parent.parent
_backend_dir = _project_root / "ui" / "backend"
if not _backend_dir.is_dir():
    raise ImportError(f"Backend directory not found at {_backend_dir}")
# Extend package search path so that submodules resolve from the UI backend folder.
__path__.append(str(_backend_dir))
# Ensure the project root is on sys.path for absolute imports like `ml.inference_service`.
sys.path.insert(0, str(_project_root))
