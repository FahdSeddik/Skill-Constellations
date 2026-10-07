import streamlit as st

from skillnet_ui.anim_data import (
    OBSERVED,
    Run,
    load_keyframes,
    load_nodes,
    load_run,
    simulated_runs,
)
from skillnet_ui.config import HUB_TYPES, Settings
from skillnet_ui.exports import ANIM_HUB_TYPES, NETWORK_EXPORTS
from skillnet_ui.player.embed import player_html
from skillnet_ui.player.network import Panel
from skillnet_ui.player.scene import hub_types, network_scene, risk_curve
from skillnet_ui.views import (
    export_stamp,
    exports_ready,
    show_view,
    showcase_tokens,
)

SCENARIOS = {
    "none": "No audit",
    "out_degree": "Audit of the 100 repositories with the highest copy out-degree",
    "stars": "Audit of the 100 most starred repositories",
    "model": "Audit of the 100 repositories that the source-choice model scores highest",
}
AUDIT = (
    "Each audit takes place on 1 April 2026. An audited repository loses its high-risk skills "
    "on that date and afterwards neither passes on nor adopts one."
)
CAPTION = (
    "The observed copies are on the left, and one run of the spread model over the same weeks "
    "is on the right."
)


@st.cache_data(show_spinner="Preparing the replay", max_entries=4)
def cached_player(settings: Settings, run: Run, stamp: tuple[int, ...]) -> str:
    observed = load_run(settings, Run(OBSERVED, 0))
    simulated = load_run(settings, run)
    panels = [Panel(observed, "Observed"), Panel(simulated, "Simulated")]
    types = hub_types(HUB_TYPES)
    curve = risk_curve(observed.weeks, simulated.weeks)
    scene = network_scene(load_nodes(settings), load_keyframes(settings), panels, curve, types)
    return player_html({**scene, "caption": CAPTION}, showcase_tokens(settings), "replay")


def choose_run(runs: list[Run]) -> Run:
    scenarios = [name for name in SCENARIOS if any(run.scenario == name for run in runs)]
    scenario = st.sidebar.selectbox(
        "Audit scenario",
        scenarios,
        format_func=SCENARIOS.__getitem__,
        help=AUDIT,
        key="replay_scenario",
    )
    chosen = scenario or scenarios[0]
    seeds = sorted(run.seed for run in runs if run.scenario == chosen)
    seed = st.sidebar.segmented_control(
        "Simulation run",
        seeds,
        format_func=lambda value: f"Run {value}",
        default=seeds[0],
        required=True,
        key=f"replay_seed_{chosen}",
    )
    return Run(chosen, int(seed if seed is not None else seeds[0]))


def render(settings: Settings) -> None:
    if not exports_ready(settings, NETWORK_EXPORTS):
        return
    runs = [run for run in simulated_runs(settings) if run.scenario in SCENARIOS]
    if not runs:
        st.info("The exported data has no simulation run.")
        return
    run = choose_run(runs)
    stamp = export_stamp(settings, (*NETWORK_EXPORTS, ANIM_HUB_TYPES))
    show_view(showcase_tokens(settings), cached_player(settings, run, stamp))
