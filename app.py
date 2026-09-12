"""Public entrypoint. Studio is opt-in until cloud browser validation completes."""
from pathlib import Path
import runpy
import streamlit as st
ROOT=Path(__file__).resolve().parent
if st.query_params.get('experience') == 'studio':
    st.set_page_config(page_title='AeroPredict | Atelier moteur',page_icon=str(ROOT/'assets/favicon.svg'),layout='wide',initial_sidebar_state='collapsed')
    st.markdown('''<style>
    [data-testid="stHeader"]{display:none}
    .block-container{padding:0!important;max-width:none!important}
    [data-testid="stMainBlockContainer"]{padding:0!important;max-width:none!important}
    [data-testid="stMain"]{background:#f7f8fa}
    [data-testid="stVerticalBlock"]{gap:0}
    iframe{border:0!important;display:block}
    </style>''',unsafe_allow_html=True)
    studio=ROOT/'frontend/studio.html'
    if studio.exists():
        st.iframe(studio.read_text(),height=1000)
    else:
        st.error('L’atelier doit être compilé. Les analyses restent disponibles ci-dessous.')
    st.markdown('[Ouvrir les analyses classiques](?experience=classic)',unsafe_allow_html=False)
else:
    runpy.run_path(str(ROOT/'classic_app.py'),run_name='__main__')
