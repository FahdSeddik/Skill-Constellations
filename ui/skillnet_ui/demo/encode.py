import subprocess
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import IO

FRAME_RATE = 30
GIF_LIMIT_BYTES = 10 * 1024 * 1024
GIF_TRIES = ((15, 960), (12, 960), (15, 880), (12, 880))
FFMPEG = ["ffmpeg", "-y", "-loglevel", "error"]
GIF_FILTER = (
    "[0:v]trim=end_frame=1,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.5[end];"
    "[end][1:v]concat=n=2:v=1,fps={fps},scale={width}:-1:flags=lanczos,split[a][b];"
    "[a]palettegen=stats_mode=diff:max_colors=128[p];"
    "[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle"
)


@contextmanager
def video_sink(target: Path) -> Iterator[IO[bytes]]:
    target.parent.mkdir(parents=True, exist_ok=True)
    command = [
        *FFMPEG,
        *("-f", "image2pipe", "-framerate", str(FRAME_RATE), "-c:v", "png", "-i", "-"),
        *("-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart"),
        str(target),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    try:
        yield process.stdin
    finally:
        process.stdin.close()
        if process.wait() != 0:
            raise RuntimeError(f"ffmpeg failed while writing {target}")


def make_gif(video: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    for fps, width in GIF_TRIES:
        filters = GIF_FILTER.format(fps=fps, width=width)
        inputs = ["-sseof", "-0.1", "-i", str(video), "-i", str(video)]
        subprocess.run([*FFMPEG, *inputs, "-filter_complex", filters, str(target)], check=True)
        if target.stat().st_size <= GIF_LIMIT_BYTES:
            return
    raise RuntimeError(f"{target} stays above {GIF_LIMIT_BYTES} bytes")
