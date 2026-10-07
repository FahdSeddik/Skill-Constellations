from collections.abc import Iterable
from string import Template

import streamlit as st

from skillnet_ui.config import BUNDLE, Settings
from skillnet_ui.exports import Export, is_exported
from skillnet_ui.theme import Tokens, load_tokens


def export_stamp(settings: Settings, exports: Iterable[Export]) -> tuple[int, ...]:
    paths = [export.path(settings) for export in exports]
    return tuple(path.stat().st_mtime_ns if path.exists() else 0 for path in paths)


STAGE_TARGETS = {"compute": "compute", "ui": "report"}


def missing_note(settings: Settings, missing: list[Export]) -> str:
    listed = ", ".join(f"`{export.name}`" for export in missing)
    if settings.bundled:
        return f"The viewer data in `{BUNDLE}` lacks {listed}."
    return f"The '{settings.profile}' profile has not exported {listed} yet."


def exports_ready(settings: Settings, exports: Iterable[Export]) -> bool:
    missing = [export for export in exports if not is_exported(settings, export)]
    if missing:
        st.info(missing_note(settings, missing))
        targets = [] if settings.bundled else sorted({STAGE_TARGETS[e.stage] for e in missing})
        for target in targets:
            st.code(f"make {target} PROFILE={settings.profile}", language="bash")
    return not missing


def showcase_tokens(settings: Settings) -> Tokens:
    return load_tokens(settings.tokens_path)


VIEW_HEIGHT = 640
FULL_WINDOW = Template(
    """<style>
[data-testid="stApp"], [data-testid="stMain"] { background: $sky; }
[data-testid="stMain"] { overflow: hidden; height: 100vh; transform: translateZ(0); }
[data-testid="stHeader"], [data-testid="stToolbar"] {
  background: transparent; pointer-events: none;
}
[data-testid="stToolbarActions"], [data-testid="stMainMenu"], [data-testid="stAppDeployButton"],
[data-testid="stDecoration"], [data-testid="stStatusWidget"] { display: none; }
[data-testid="stExpandSidebarButton"] {
  pointer-events: auto; background: $haze; border: 1px solid $line; border-radius: 8px;
}
[data-testid="stExpandSidebarButton"], [data-testid="stExpandSidebarButton"] * { color: $ink; }
[data-testid="stMainBlockContainer"] { padding: 0; max-width: none; }
iframe[data-testid="stIFrame"] {
  position: fixed; inset: 0; width: 100%; height: 100%; border: 0; z-index: 0;
}
</style>"""
)


def full_window_style(tokens: Tokens) -> str:
    return FULL_WINDOW.substitute(dict(tokens.showcase))


def show_view(tokens: Tokens, html: str) -> None:
    st.html(full_window_style(tokens))
    st.iframe(html, height=VIEW_HEIGHT)
