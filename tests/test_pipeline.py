import json
import joblib
import numpy as np
import pandas as pd
from src.config import ROOT
from src.data_loader import read_raw
from src.features import make_features, targets
from src.inference import predict
from src.business_rules import decisions
from src.evaluation import regression_metrics

def test_data_schema_and_truth():
    d=read_raw(); assert d.shape==(20631,26)
    assert d.unit.nunique()==100
    y=targets(d); assert (y>=0).all()
    assert (y.loc[d.groupby('unit').tail(1).index]==0).all()

def test_disjoint_engine_splits():
    m=json.loads((ROOT/'artifacts/metrics/results.json').read_text())
    a,b,c=[set(m['split'][k]) for k in ['train','validation','calibration']]
    assert not a&b and not a&c and not b&c
    assert len(a|b|c)==100

def test_future_sensor_changes_do_not_change_past_features():
    d=read_raw().query('unit == 1').copy()
    before=make_features(d,['s4','s11'])
    d.loc[d.cycle>60,['s4','s11']]=99999
    after=make_features(d,['s4','s11'])
    pd.testing.assert_frame_equal(before.loc[d.cycle<=60],after.loc[d.cycle<=60])

def test_engine_boundaries_reset_rolling_features():
    d=read_raw(); f=make_features(d,['s4'])
    starts=d.groupby('unit').head(1).index
    np.testing.assert_allclose(f.loc[starts,'s4_mean10'],d.loc[starts,'s4'])
    assert (f.loc[starts,'s4_delta5']==0).all()

def test_saved_inference_matches_precomputed_outputs():
    bundle=joblib.load(ROOT/'artifacts/models/bundle.joblib')
    d=read_raw('test').query('unit in [1,34,100]')
    p=predict(d,bundle).groupby('unit').tail(1)
    f=pd.read_csv(ROOT/'data/processed/fleet.csv').query('unit in [1,34,100]')
    np.testing.assert_allclose(p.rul,f.rul,rtol=1e-10)
    assert (p.lower>=0).all() and (p.upper>=p.rul).all()
    assert p.health.between(0,100).all()
    assert p.failure_probability.between(0,1).all()

def test_risk_boundaries_and_priority_direction():
    x=pd.DataFrame({'unit':[1,2,3,4],'rul':[0,20,50,51],'lower':[0,1,20,30]})
    d=decisions(x)
    assert d.risk.tolist()==['CRITICAL','CRITICAL','WATCH','HEALTHY']
    assert d.priority.is_monotonic_decreasing

def test_asymmetric_score_penalizes_overestimation_more():
    assert regression_metrics([30,40],[40,50])['NASA_score']>regression_metrics([30,40],[20,30])['NASA_score']
