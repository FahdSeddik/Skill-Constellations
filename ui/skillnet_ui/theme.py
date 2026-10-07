import re
from dataclasses import dataclass
from pathlib import Path

import yaml

from skillnet_ui.tables import SchemaError, require_field

HEX_COLOR = re.compile(r"#[0-9a-fA-F]{6}")
COLOR_KEYS = (
    "focus",
    "focus_light",
    "baseline",
    "baseline_light",
    "accent",
    "fill",
    "risk",
    "text",
    "grid",
)
SHOWCASE_KEYS = ("sky", "haze", "star", "glow", "trail", "risk", "mark", "ink", "muted", "line")


@dataclass(frozen=True)
class Colors:
    focus: str
    focus_light: str
    baseline: str
    baseline_light: str
    accent: str
    fill: str
    risk: str
    text: str
    grid: str
    categorical: tuple[str, ...]


@dataclass(frozen=True)
class Tokens:
    colors: Colors
    showcase: tuple[tuple[str, str], ...]
    ui_font: str
    label_font: str


def check_hex(name: str, value: object) -> str:
    if not isinstance(value, str) or not HEX_COLOR.fullmatch(value):
        raise SchemaError(f"color '{name}' must look like #rrggbb, got {value!r}")
    return value


def parse_colors(raw: object) -> Colors:
    section = require_field(raw, "colors", dict)
    categorical = require_field(section, "categorical", list)
    if not categorical:
        raise SchemaError("colors.categorical must not be empty")
    values = {key: check_hex(key, require_field(section, key, object)) for key in COLOR_KEYS}
    return Colors(**values, categorical=tuple(check_hex("categorical", c) for c in categorical))


def parse_showcase(raw: object) -> tuple[tuple[str, str], ...]:
    section = require_field(raw, "showcase", dict)
    return tuple(
        (key, check_hex(f"showcase.{key}", require_field(section, key, object)))
        for key in SHOWCASE_KEYS
    )


def parse_tokens(raw: object) -> Tokens:
    fonts = require_field(raw, "fonts", dict)
    return Tokens(
        colors=parse_colors(raw),
        showcase=parse_showcase(raw),
        ui_font=require_field(fonts, "ui", str),
        label_font=require_field(fonts, "ui_label", str),
    )


def load_tokens(path: Path) -> Tokens:
    try:
        return parse_tokens(yaml.safe_load(path.read_text(encoding="utf-8")))
    except FileNotFoundError as error:
        raise SchemaError(f"{path}: file is missing") from error
    except SchemaError as error:
        raise SchemaError(f"{path}: {error}") from error


def sidebar_flags(tokens: Tokens) -> dict[str, str]:
    night = dict(tokens.showcase)
    return {
        "sidebar.backgroundColor": night["sky"],
        "sidebar.secondaryBackgroundColor": night["haze"],
        "sidebar.textColor": night["ink"],
        "sidebar.primaryColor": night["glow"],
        "sidebar.borderColor": night["line"],
        "sidebar.linkColor": night["glow"],
    }


def theme_flags(tokens: Tokens) -> list[str]:
    colors = tokens.colors
    options = {
        "base": "light",
        "primaryColor": colors.focus,
        "textColor": colors.text,
        "secondaryBackgroundColor": colors.fill,
        "linkColor": colors.focus,
        "grayColor": colors.baseline,
        "redColor": colors.risk,
        **sidebar_flags(tokens),
    }
    return [f"--theme.{name}={value}" for name, value in options.items()]
