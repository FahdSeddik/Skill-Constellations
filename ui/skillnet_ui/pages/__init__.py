from collections.abc import Callable
from dataclasses import dataclass

from skillnet_ui.config import Settings


@dataclass(frozen=True)
class PageSpec:
    title: str
    url_path: str
    icon: str
    render: Callable[[Settings], None]
