import json
import pandas as pd
import streamlit as st
from src.config import ROOT
from src.ui import style
from src.views import VIEWS
st.set_page_config(page_title='AeroPredict MRO | Fleet Intelligence',page_icon=str(ROOT/'assets/favicon.svg'),layout='wide',initial_sidebar_state='expanded')
style()
@st.cache_data
def load():
    return (pd.read_csv(ROOT/'data/processed/fleet.csv'),pd.read_csv(ROOT/'data/processed/history.csv.gz'),pd.read_csv(ROOT/'data/processed/sensors.csv.gz'),json.loads((ROOT/'artifacts/metrics/results.json').read_text()))
with st.sidebar:
    st.markdown('<div class="brand"><b>∧</b> AeroPredict</div><div class="brand-sub">MRO / ENGINE INTELLIGENCE</div><div class="eyebrow">WORKSPACE</div>',unsafe_allow_html=True)
    names=list(VIEWS); requested=st.query_params.get('page',names[0]); idx=names.index(requested) if requested in names else 0
    selected=st.radio('Workspace',names,index=idx,label_visibility='collapsed')
    st.divider(); st.markdown('**NASA FD001**'); st.caption('100 simulated engines\n\nIndependent academic project\n\nOffline dataset snapshot')
st.markdown('<div class="topline"><span>OPERATIONS / ENGINE INTELLIGENCE</span><span>FD001 &nbsp; / &nbsp; RESEARCH EDITION</span></div>',unsafe_allow_html=True)
try:
    data=load()
except FileNotFoundError:
    st.error('Prepared artifacts are missing. Run python scripts/train_models.py before starting the app.');st.stop()
VIEWS[selected](*data)
st.markdown('<div class="footnote">AEROPREDICT MRO &nbsp; / &nbsp; Independent academic demonstrator. Simulated NASA data. Not for operational aircraft decisions.</div>',unsafe_allow_html=True)
