from pathlib import Path
from streamlit.testing.v1 import AppTest
from src.views import VIEWS
ROOT=Path(__file__).resolve().parents[1]

def test_all_pages_render_and_filters_work():
    at=AppTest.from_file(str(ROOT/'app.py'),default_timeout=30).run()
    assert not at.exception
    for name in VIEWS:
        at.radio[0].set_value(name).run()
        assert not at.exception, name
    at.radio[0].set_value('Engine Health').run()
    for engine in ['ENG-001','ENG-050','ENG-100']:
        at.selectbox[0].set_value(engine).run()
        assert not at.exception
    at.radio[0].set_value('Prognostics & Alerts').run()
    at.text_input[0].set_value('DOES-NOT-EXIST').run()
    assert not at.exception and len(at.info)==1
    at.radio[0].set_value('Maintenance Planner').run()
    at.slider[0].set_value(1).run()
    assert not at.exception
