import logging

logging.getLogger("streamlit.runtime.caching.cache_data_api").addFilter(lambda _: False)


def main() -> None:
    from skillnet_ui.config import load_settings
    from skillnet_ui.site.build import build_site

    build_site(load_settings())


main()
