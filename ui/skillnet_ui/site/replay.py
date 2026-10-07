import shutil
from pathlib import Path

from skillnet_ui.anim_data import Run, RunFrames, load_keyframes, load_nodes, load_run
from skillnet_ui.config import HUB_TYPES, Settings
from skillnet_ui.exports import ANIM_AUDITED, NETWORK_EXPORTS, is_exported, load_export
from skillnet_ui.player.audit import SCENARIOS, audit_scene
from skillnet_ui.player.embed import player_html
from skillnet_ui.player.scene import hub_types
from skillnet_ui.site.menu import with_menu
from skillnet_ui.views import showcase_tokens

SEED = 1
TITLE = "Where to audit"


def audit_runs(settings: Settings) -> dict[str, RunFrames] | None:
    if not all(is_exported(settings, export) for export in (*NETWORK_EXPORTS, ANIM_AUDITED)):
        return None
    runs = {scenario: load_run(settings, Run(scenario, SEED)) for scenario in SCENARIOS}
    return None if any(run.weeks.is_empty() for run in runs.values()) else runs


def audit_page(settings: Settings, menu: str, style: str) -> str | None:
    runs = audit_runs(settings)
    audited = load_export(settings, ANIM_AUDITED)
    if runs is None or audited is None:
        return None
    types = hub_types(HUB_TYPES)
    nodes, keyframes = load_nodes(settings), load_keyframes(settings)
    scene = audit_scene(nodes, keyframes, runs, audited, types)
    page = player_html(scene, showcase_tokens(settings), "replay-audit")
    return with_menu(page, TITLE, menu, style)


def write_audit_page(settings: Settings, folder: Path, menu: str, style: str) -> None:
    shutil.rmtree(folder, ignore_errors=True)
    page = audit_page(settings, menu, style)
    if page is not None:
        folder.mkdir()
        (folder / "audit.html").write_text(page, "utf-8")
