UV = uv --directory ui run --locked --no-dev
UV_DEMO = $(UV) --group demo

.DEFAULT_GOAL := viewer
.PHONY: viewer site demo

viewer:
	$(UV) python -m skillnet_ui

site:
	$(UV) python -m skillnet_ui.site

demo: site
	$(UV_DEMO) playwright install chromium
	$(UV_DEMO) python -m skillnet_ui.demo
