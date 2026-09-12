import json
from pathlib import Path
from scripts.generate_aircraft_scenarios import build
ROOT=Path(__file__).resolve().parents[1]
def test_synthetic_generator_is_reproducible_and_separate():
    data, rows=build()
    assert data==json.loads((ROOT/'frontend/src/aircraft-data.json').read_text())
    assert len(rows)==3600
    assert all(r['source']=='synthetic-v1' for r in rows)
    assert all(r['aircraft'].startswith('DEMO-') for r in rows)
    assert {r['system'] for r in rows}=={'apu','brakes','hydraulic','pack','actuator'}
