"""The new UI must retain source data semantics and an executable Python shell."""
from pathlib import Path
import json
import numpy as np
import pandas as pd
from streamlit.testing.v1 import AppTest
from scripts.export_studio_data import export
ROOT=Path(__file__).resolve().parents[1]

def test_studio_decision_data_matches_source_and_excludes_truth():
    payload=json.loads(export().read_text())
    source=pd.read_csv(ROOT/'data/processed/fleet.csv').sort_values('unit')
    exposed=pd.DataFrame(payload['fleet']).sort_values('unit')
    assert len(exposed)==100
    assert 'actual_rul' not in exposed.columns
    np.testing.assert_allclose(exposed.rul,source.rul,atol=1e-6)
    np.testing.assert_allclose(exposed.lower,source.lower,atol=1e-6)
    assert exposed.risk.tolist()==source.risk.tolist()
    history=pd.read_csv(ROOT/'data/processed/history.csv.gz')
    assert sum(len(v) for v in payload['history'].values())==len(history)
    for unit,rows in payload['history'].items():
        assert len(rows)==len(history[history.unit==int(unit)])
        assert rows[-1][0]==source[source.unit==int(unit)].cycle.iloc[0]

def test_studio_shell_and_classic_escape_hatch():
    at=AppTest.from_file(str(ROOT/'app.py'),default_timeout=30)
    at.query_params['experience']='studio'
    at.run()
    assert not at.exception
    assert any('analyses classiques' in m.value for m in at.markdown)
    html=(ROOT/'frontend/studio.html').read_text()
    assert '<script type="module">' in html
    assert 'fonts.googleapis.com' not in html
    assert 'src="./assets/' not in html

def test_aircraft_is_separately_served_and_old_scene_is_not_packaged():
    import gzip
    import tomllib
    html=(ROOT/'frontend/studio.html').read_text()
    assert 'app/static/models/a350-900.glb.gz' in html
    assert 'a320neo.glb' not in html
    assert 'Chargement de l’A320' not in html
    assert len(html.encode()) < 2_000_000
    config=tomllib.loads((ROOT/'.streamlit/config.toml').read_text())
    assert config['server']['enableStaticServing']
    model=gzip.decompress((ROOT/'static/models/a350-900.glb.gz').read_bytes())
    assert model[:4] == b'glTF'
