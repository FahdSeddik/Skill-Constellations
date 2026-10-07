import hashlib
from functools import lru_cache

from starlette.concurrency import run_in_threadpool
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Route

from skillnet_ui.config import HUB_TYPES, Settings, load_settings
from skillnet_ui.player.scene import hub_types
from skillnet_ui.sky.exports import SKY_CLUMP_EXPORTS, SKY_EXPORTS, SKY_HUB_TYPES
from skillnet_ui.sky.pack import pack_sky
from skillnet_ui.views import export_stamp

DATA_PATH = "/sky-data"
CACHED = {"Cache-Control": "private, max-age=86400, immutable"}


def sky_stamp(settings: Settings) -> tuple[int, ...]:
    return export_stamp(settings, (*SKY_EXPORTS, SKY_HUB_TYPES, *SKY_CLUMP_EXPORTS))


def data_url(settings: Settings) -> str:
    stamp = (settings.profile, sky_stamp(settings))
    digest = hashlib.sha1(repr(stamp).encode()).hexdigest()[:16]
    return f"{DATA_PATH}/{digest}.bin"


@lru_cache(maxsize=2)
def packed(settings: Settings, stamp: tuple[int, ...]) -> bytes:
    return pack_sky(settings, hub_types(HUB_TYPES))


async def sky_data(request: Request) -> Response:
    settings = load_settings()
    body = await run_in_threadpool(packed, settings, sky_stamp(settings))
    return Response(body, media_type="application/octet-stream", headers=CACHED)


SKY_ROUTES = [Route(DATA_PATH + "/{name}", sky_data)]
