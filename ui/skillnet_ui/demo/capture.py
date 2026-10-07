from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from typing import IO

from playwright.sync_api import Page, ViewportSize, sync_playwright

from skillnet_ui.config import Settings
from skillnet_ui.demo.encode import FRAME_RATE

DEMO_SKILL = "web-design-guidelines"
SKY_SETUP = "window.skyView.setColoured(true)"
CLOCK_START = "window.skyView.clock.start"
FIRST_HOLDER = "Math.min(...window.player.scene.panels[0].lit.filter((t) => t >= 0))"
SETTLE_FRAMES = 90


@dataclass(frozen=True)
class Clip:
    name: str
    page: str
    view: str
    seconds: int
    setup: str
    start: str
    settle: int


def clips(settings: Settings) -> list[Clip]:
    page = f"skills/{DEMO_SKILL}.html"
    if not (settings.root / "dist" / "site" / page).exists():
        raise ValueError(f"the site has no page for the demo skill {DEMO_SKILL}, run make site")
    return [
        Clip("network", "index.html", "skyView", 20, SKY_SETUP, CLOCK_START, 0),
        Clip("skill", page, "player", 12, "", FIRST_HOLDER, SETTLE_FRAMES),
    ]


VIEWPORT: ViewportSize = {"width": 1920, "height": 1080}
READY_MS = 120_000


def clock_span(page: Page, clip: Clip) -> tuple[float, float]:
    start, end = page.evaluate(f"[{clip.start}, window.{clip.view}.clock.end]")
    return start, end


def open_clip(page: Page, base: str, clip: Clip) -> None:
    page.goto(f"{base}{clip.page}?record")
    page.wait_for_selector(".ready", state="attached", timeout=READY_MS)
    if clip.setup:
        page.evaluate(clip.setup)


def capture(base: str, clip: Clip, sink: IO[bytes]) -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(viewport=VIEWPORT)
        open_clip(page, base, clip)
        start, end = clock_span(page, clip)
        for _ in range(clip.settle):
            page.evaluate(f"window.{clip.view}.renderAt({start})")
        frames = clip.seconds * FRAME_RATE
        for index in range(frames):
            moment = start + (end - start) * index / (frames - 1)
            page.evaluate(f"window.{clip.view}.renderAt({moment})")
            sink.write(page.screenshot(type="png"))
        browser.close()


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        return None


@contextmanager
def serve(directory: Path) -> Iterator[str]:
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=directory))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/"
    finally:
        server.shutdown()
