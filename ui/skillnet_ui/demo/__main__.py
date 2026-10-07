from skillnet_ui.config import load_settings
from skillnet_ui.demo.capture import capture, clips, serve
from skillnet_ui.demo.encode import make_gif, video_sink


def main() -> None:
    settings = load_settings()
    site = settings.root / "dist" / "site"
    media = settings.root / "media"
    with serve(site) as base:
        for clip in clips(settings):
            video = site / "media" / f"{clip.name}.mp4"
            with video_sink(video) as sink:
                capture(base, clip, sink)
            make_gif(video, media / f"{clip.name}.gif")


main()
