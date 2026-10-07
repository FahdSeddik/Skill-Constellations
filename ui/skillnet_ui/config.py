import os
import re
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PROFILE = "sample"
PROFILE_PATTERN = re.compile(r"[a-z][a-z0-9_]*")
APP_NAME = "Skill Constellations"
BUNDLE = Path("ui") / "data"
HUB_TYPES = (
    "Aggregator catalog",
    "Starter template",
    "Self-copying owner",
    "Bot-generated",
    "Coordinated cluster",
    "Ordinary project",
    "Other",
)


@dataclass(frozen=True)
class Settings:
    profile: str
    root: Path

    @property
    def bundle_dir(self) -> Path:
        return self.root / BUNDLE

    @property
    def bundled(self) -> bool:
        return self.bundle_dir.is_dir()

    def stage_dir(self, stage: str) -> Path:
        return self.root / "results" / self.profile / stage

    def export_dir(self, stage: str) -> Path:
        return self.bundle_dir if self.bundled else self.stage_dir(stage)

    @property
    def tokens_path(self) -> Path:
        return self.root / "style" / "tokens.yml"


def load_settings(environ: Mapping[str, str] = os.environ, root: Path = REPO_ROOT) -> Settings:
    profile = environ.get("SKILLNET_PROFILE") or DEFAULT_PROFILE
    if not PROFILE_PATTERN.fullmatch(profile):
        raise ValueError(
            f"SKILLNET_PROFILE must be lowercase letters, digits or _, not '{profile}'"
        )
    return Settings(profile=profile, root=root)
