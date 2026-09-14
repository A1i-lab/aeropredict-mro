"""Inference-only representative training histories with bounded perturbations."""
import sys, json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import joblib
import numpy as np
import pandas as pd
from src.config import ROOT
from src.data_loader import read_raw

SEED = 20260914

def build():
    bundle=joblib.load(ROOT/'artifacts/models/bundle.joblib')
    metadata=json.loads((ROOT/'artifacts/metrics/results.json').read_text())
    data=read_raw('train'); data=data[data.unit.isin(metadata['split']['train'])]
    sensors=bundle['sensors']; rng=np.random.default_rng(SEED)
    source_unit=sorted(metadata['split']['train'])[0]
    source=data[data.unit==source_unit].sort_values('cycle')
    spread=data[sensors].quantile(.75)-data[sensors].quantile(.25)
    frames=[]; provenance=[]
    for i,fraction in enumerate([.30,.55,.75,.90,.98],1):
        stop=max(30,int(len(source)*fraction)); block=source.iloc[stop-30:stop][['cycle',*sensors]].copy()
        for s in sensors:
            noise=rng.uniform(-.015,.015,len(block))*spread[s]
            block[s]=(block[s]+noise).clip(data[s].min(),data[s].max())
        name=f'SYN-ENG-{i:03d}'; block.insert(0,'engine_id',name); frames.append(block)
        provenance.append({'engine_id':name,'source_training_unit':int(source_unit),'lifetime_fraction':fraction,'first_cycle':int(block.cycle.min()),'last_cycle':int(block.cycle.max())})
    return pd.concat(frames,ignore_index=True), {'seed':SEED,'label':'SYNTHETIC / DEMONSTRATION DATA','method':'30 consecutive observations from one fitted-training engine at five lifetime stages, plus independent uniform noise bounded to +/-1.5% of training IQR per sensor; clipped to fitted-training min/max. Not independent validation engines. No assigned RUL or target values.','sensors':sensors,'profiles':provenance,'excluded_from':'training, validation, calibration and all official evaluation metrics'}

if __name__=='__main__':
    frame,meta=build()
    frame.to_csv(ROOT/'data/synthetic/diagnostic_engines.csv',index=False,float_format='%.10g')
    (ROOT/'data/synthetic/diagnostic_engines.json').write_text(json.dumps(meta,indent=2)+'\n')
