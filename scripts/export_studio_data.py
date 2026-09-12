"""Export public decision inputs for the interactive studio. No evaluation truth."""
from pathlib import Path
import json
import pandas as pd
ROOT = Path(__file__).resolve().parents[1]
DECISION_COLUMNS = ['unit','engine','cycle','rul','lower','upper','risk','priority','health','failure_probability']
def export():
    fleet = pd.read_csv(ROOT/'data/processed/fleet.csv')
    history = pd.read_csv(ROOT/'data/processed/history.csv.gz')
    sensors = pd.read_csv(ROOT/'data/processed/sensors.csv.gz')
    merged = history.merge(sensors[['unit','cycle','s4','s11']],on=['unit','cycle'],validate='one_to_one')
    trajectories = {}
    for unit,g in merged.groupby('unit'):
        trajectories[str(unit)] = g[['cycle','rul','lower','upper','s4','s11']].round(3).values.tolist()
    payload = {'fleet':fleet[DECISION_COLUMNS].round(6).to_dict('records'),'history':trajectories,
      'metrics':json.loads((ROOT/'artifacts/metrics/results.json').read_text()),
      'comparison':pd.read_csv(ROOT/'artifacts/metrics/comparison.csv').to_dict('records')}
    target = ROOT/'frontend/src/data.json'
    target.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'),allow_nan=False))
    return target
if __name__=='__main__': print(export())
