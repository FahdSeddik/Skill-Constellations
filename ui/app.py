import streamlit as st

from skillnet_ui.sky.route import SKY_ROUTES

app = st.App("main.py", routes=SKY_ROUTES)
