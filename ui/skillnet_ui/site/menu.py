import re
from html import escape
from pathlib import Path
from string import Template

from skillnet_ui.config import APP_NAME
from skillnet_ui.theme import Tokens

ASSETS = Path(__file__).resolve().parent / "assets"
CODE_URL = "https://github.com/FahdSeddik/Skill-Constellations"
DATA_URL = "https://github.com/FahdSeddik/Skill-Constellations/releases/tag/data-v1.0"
MENU_WIDTH = "280px"
VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1">'
ID = re.compile(r'(id="|url\(#)')
TOGGLES = (("names", "Cluster names"), ("colour", "Colour by cluster"))


def menu_style(tokens: Tokens) -> str:
    names = [*dict(tokens.showcase).items(), ("label-font", tokens.label_font)]
    names.append(("menu-width", MENU_WIDTH))
    variables = "".join(f"--{name}: {value}; " for name, value in names)
    return f":root {{ {variables}}}\n" + (ASSETS / "menu.css").read_text(encoding="utf-8")


def logo_markup(logo: str) -> str:
    return ID.sub(r"\1logo-", logo).replace("<svg ", '<svg class="menu-logo" ', 1)


def option(name: str, root: str, selected: bool) -> str:
    mark = " selected" if selected else ""
    return f'<option value="{root}skills/{escape(name)}.html"{mark}>{escape(name)}</option>'


def picker(groups: dict[str, list[str]], current: str | None, root: str) -> str:
    placeholder = "" if current else " selected"
    parts = [f'<option value="" disabled hidden{placeholder}>Choose a skill</option>']
    marked = False
    for title, names in groups.items():
        options = []
        for name in names:
            options.append(option(name, root, name == current and not marked))
            marked = marked or name == current
        parts.append(f'<optgroup label="{escape(title)}">{"".join(options)}</optgroup>')
    return "".join(parts)


def toggles(clusters: bool) -> str:
    if not clusters:
        return ""
    buttons = "".join(
        f'<button class="menu-switch" data-toggle="{key}" aria-pressed="false">{label}</button>'
        for key, label in TOGGLES
    )
    return f'<section class="menu-section"><h2>Display</h2>{buttons}</section>'


def menu_html(
    groups: dict[str, list[str]], current: str | None, root: str, clusters: bool, logo: str
) -> str:
    page = Template((ASSETS / "menu.html").read_text(encoding="utf-8"))
    return page.substitute(
        brand=APP_NAME,
        logo=logo_markup(logo),
        home=f"{root}index.html",
        options=picker(groups, current, root),
        toggles=toggles(clusters),
        code=CODE_URL,
        data=DATA_URL,
    )


def with_menu(page: str, title: str, menu: str, style: str) -> str:
    heading = f"{VIEWPORT}<title>{escape(title)} | {APP_NAME}</title><style>{style}</style>"
    page = page.replace("</head>", f"{heading}</head>", 1)
    body, _, tail = page.rpartition("</body>")
    script = (ASSETS / "menu.js").read_text(encoding="utf-8")
    return f"{body}{menu}<script>\n{script}</script></body>{tail}"
