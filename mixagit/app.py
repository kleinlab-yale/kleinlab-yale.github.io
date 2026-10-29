"""Hugging Face Spaces entrypoint for the MIXA Streamlit app."""

from pathlib import Path
import sys

import streamlit as st


def _run_embedded_app():
    app_dir = str(Path(__file__).resolve().parent)
    if app_dir not in sys.path:
        sys.path.insert(0, app_dir)
    app_path = Path(__file__).with_name("mixa_app.py")
    code = compile(app_path.read_text(), str(app_path), "exec")
    exec_globals = globals()
    exec_globals["__file__"] = str(app_path)
    exec_globals["__name__"] = "__main__"
    exec(code, exec_globals, exec_globals)


if __name__ == "__main__":
    try:
        _run_embedded_app()
    except Exception as exc:
        st.error("MIXA failed to render.")
        st.exception(exc)
