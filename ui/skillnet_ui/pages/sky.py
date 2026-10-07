import streamlit as st

from skillnet_ui.config import Settings
from skillnet_ui.exports import is_exported
from skillnet_ui.sky.exports import SKY_CLUMPS, SKY_EXPORTS
from skillnet_ui.sky.route import data_url, sky_stamp
from skillnet_ui.sky.view import sky_view
from skillnet_ui.views import exports_ready, show_view, showcase_tokens

COLOUR_TOGGLE = "Colour by cluster"
COLOUR_HELP = (
    "Colours the stars of each large cluster, a group of repositories that share many skills, "
    "and leaves the other stars grey."
)


@st.cache_data(show_spinner=False, max_entries=4)
def cached_view(settings: Settings, stamp: tuple[int, ...], coloured: bool) -> str:
    return sky_view(settings, data_url(settings), coloured)


def colour_toggle(settings: Settings) -> bool:
    if not is_exported(settings, SKY_CLUMPS):
        return False
    return st.sidebar.toggle(COLOUR_TOGGLE, value=False, key="sky_clumps", help=COLOUR_HELP)


def render(settings: Settings) -> None:
    if not exports_ready(settings, SKY_EXPORTS):
        return
    coloured = colour_toggle(settings)
    show_view(showcase_tokens(settings), cached_view(settings, sky_stamp(settings), coloured))
