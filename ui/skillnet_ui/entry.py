from collections.abc import Callable
from importlib.util import find_spec

import streamlit as st

from skillnet_ui.config import APP_NAME, Settings
from skillnet_ui.pages import PageSpec, journey, replay, sky
from skillnet_ui.tables import SchemaError
from skillnet_ui.theme import load_tokens

VIEWS = (
    PageSpec("Repository network", "network", ":material/auto_awesome:", sky.render),
    PageSpec("Skill constellation", "constellation", ":material/route:", journey.render),
    PageSpec("Spread model replay", "replay", ":material/compare:", replay.render),
)
TOOLS = "skillnet_ui.tools"


def sections() -> dict[str, tuple[PageSpec, ...]]:
    if find_spec(TOOLS) is None:
        return {APP_NAME: VIEWS}
    from skillnet_ui.tools.section import PAGES, TITLE

    return {APP_NAME: VIEWS, TITLE: PAGES}


def bind(render: Callable[[Settings], None], settings: Settings) -> Callable[[], None]:
    def page() -> None:
        render(settings)

    return page


def build_pages(settings: Settings) -> dict[str, list[st.Page]]:
    return {
        section: [
            st.Page(
                bind(spec.render, settings),
                title=spec.title,
                icon=spec.icon,
                url_path=spec.url_path,
            )
            for spec in specs
        ]
        for section, specs in sections().items()
    }


def run(settings: Settings) -> None:
    st.set_page_config(page_title=APP_NAME, layout="wide", initial_sidebar_state="collapsed")
    try:
        load_tokens(settings.tokens_path)
    except SchemaError as error:
        st.error(str(error))
        st.stop()
    st.navigation(build_pages(settings)).run()
