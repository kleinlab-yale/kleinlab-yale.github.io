"""Vector plot previews with bounded layout size; raster DPI is export-only."""

import io

import matplotlib as mpl
import streamlit as st


def figure_svg(figure):
    output = io.StringIO()
    with mpl.rc_context({"svg.fonttype": "path", "svg.hashsalt": "mixa-preview"}):
        figure.savefig(output, format="svg", bbox_inches="tight", metadata={"Date": None})
    return output.getvalue()


def show_figure(figure, *, use_container_width=False, width=None):
    if width is None:
        width = "stretch" if use_container_width else min(1100, max(320, round(figure.get_figwidth()*110)))
    st.image(figure_svg(figure), width=width)
