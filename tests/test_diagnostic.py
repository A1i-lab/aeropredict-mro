import io
import json
from unittest.mock import patch
import joblib
import numpy as np
import pandas as pd
import pytest
from streamlit.testing.v1 import AppTest
from src.config import ROOT
from src.diagnostic import validate, template, parse_csv, run_diagnostic, load_demo, training_reference, compatibility
from src.features import make_features
from src.inference import predict
from src.data_loader import read_raw
from scripts.generate_diagnostic_engines import build

@pytest.fixture(scope='module')
def bundle(): return joblib.load(ROOT/'artifacts/models/bundle.joblib')
@pytest.fixture
def frame(): return load_demo().query("engine_id=='SYN-ENG-001'").drop(columns='engine_id').reset_index(drop=True)

def test_valid_manual_conversion_and_template(frame,bundle):
    converted=frame.astype(str)
    clean,errors,_=validate(converted,bundle['sensors'])
    assert not errors and clean.unit.eq(1).all()
    assert list(template(bundle['sensors']))==['cycle',*bundle['sensors']]
    pd.testing.assert_frame_equal(parse_csv(frame.to_csv(index=False).encode()),frame)

@pytest.mark.parametrize('case',['column','missing','duplicate','text','extra','infinite','negative','fraction','gap','multi','target','duplicate_column','boolean'])
def test_invalid(frame,bundle,case):
    s=bundle['sensors'][0]
    if case=='boolean': frame[s]=True
    if case=='column': frame=frame.drop(columns=s)
    if case=='missing': frame.loc[0,s]=np.nan
    if case=='duplicate': frame.loc[1,'cycle']=frame.loc[0,'cycle']
    if case=='text': frame[s]=frame[s].astype(object);frame.loc[0,s]='invalid'
    if case=='extra': frame['op1']=1
    if case=='infinite': frame.loc[0,s]=np.inf
    if case=='negative': frame.loc[0,'cycle']=-1
    if case=='fraction': frame['cycle']=frame.cycle.astype(float);frame.loc[0,'cycle']=.5
    if case=='gap': frame=frame.drop(index=2)
    if case=='multi': frame['engine_id']=['a']+['b']*(len(frame)-1)
    if case=='target': frame['RUL']=10
    if case=='duplicate_column': frame=pd.concat([frame,frame[[s]]],axis=1)
    clean,errors,_=validate(frame,bundle['sensors'])
    assert clean is None and errors
    with pytest.raises(ValueError):run_diagnostic(frame,bundle)

def test_order_and_short_history(frame,bundle):
    clean,errors,warnings=validate(frame.iloc[::-1],bundle['sensors'])
    assert not errors and warnings and clean.cycle.is_monotonic_increasing
    for n in [5,9]:
        clean,errors,warnings=validate(frame.head(n),bundle['sensors']); assert not errors and warnings
        _,r,_=run_diagnostic(frame.head(n),bundle);assert len(r)==n-4
    assert validate(frame.head(4),bundle['sensors'])[1]

def test_real_inference_consistency_and_latest(bundle):
    raw=read_raw('test'); known=raw[raw.unit==1].reset_index(drop=True)
    reference=predict(known,bundle)
    clean,r,_=run_diagnostic(known[['cycle',*bundle['sensors']]].iloc[::-1],bundle,'CUSTOM-NEW')
    cols=['rul','lower','upper','failure_probability','health','priority']
    np.testing.assert_allclose(r[cols],reference.iloc[4:][cols],atol=1e-10)
    assert r.iloc[-1].cycle==known.cycle.max() and r.iloc[-1].engine=='CUSTOM-NEW'
    assert list(make_features(clean,bundle['sensors']))==bundle['features']
    assert not {'unit','engine_id','RUL','rul'}.intersection(bundle['features'])

def test_ood(frame,bundle):
    bounds=training_reference(bundle['sensors']);s=bundle['sensors'][0]
    frame.loc[0,s]=bounds.loc['max',s]+100
    state,counts=compatibility(frame,bundle['sensors'],bounds)
    assert state=='OUTSIDE TRAINING DOMAIN' and counts.outside_training_range.sum()>0
    assert not validate(frame,bundle['sensors'])[1]
    normal=pd.DataFrame([bounds.loc['p01'].add(bounds.loc['p99']).div(2)])
    assert compatibility(normal,bundle['sensors'],bounds)[0]=='NORMAL RANGE'

def test_synthetic_reproducible_and_isolated(bundle):
    generated,meta=build();generated2,meta2=build()
    pd.testing.assert_frame_equal(generated,generated2);assert meta==meta2
    pd.testing.assert_frame_equal(generated,load_demo(),check_exact=False,rtol=1e-8)
    splits=json.loads((ROOT/'artifacts/metrics/results.json').read_text())['split']
    assert all(p['source_training_unit'] in splits['train'] for p in meta['profiles'])
    assert len(generated)==150 and generated.engine_id.nunique()==5
    assert list(generated)==['engine_id','cycle',*bundle['sensors']]
    # Training entrypoint only reads the official raw files, never this sandbox.
    source=(ROOT/'scripts/train_models.py').read_text()
    assert 'diagnostic' not in source and 'synthetic' not in source
    results=[]
    for name,df in load_demo().groupby('engine_id'):
        _,r,_=run_diagnostic(df,bundle,name);results.append(r.iloc[-1].rul)
    assert len(set(np.round(results,5)))==5

def test_csv_duplicate_header_and_size():
    with pytest.raises(ValueError):parse_csv(b'cycle,s2,s2\n1,2,3')
    with pytest.raises(ValueError):parse_csv(b'x'*5_000_001)

def app():
    at=AppTest.from_file(str(ROOT/'app.py'),default_timeout=30)
    at.query_params['experience']='classic';at.query_params['page']='Predictive Diagnostic'
    return at

def test_demo_ui_and_stale_result():
    at=app().run();assert not at.exception
    at.button(key='run_diagnostic').click().run();assert not at.exception
    assert at.session_state.diagnostic_result[2].iloc[-1].engine=='SYN-ENG-001'
    at.selectbox(key='diagnostic_demo').set_value('SYN-ENG-005').run()
    assert any('Inputs changed' in c.value for c in at.caption)
    at.button(key='run_diagnostic').click().run()
    assert at.session_state.diagnostic_result[2].iloc[-1].engine=='SYN-ENG-005'

def test_manual_ui():
    at=app().run();at.radio(key='diagnostic_mode').set_value('Manual entry').run()
    assert at.button(key='run_diagnostic').disabled
    next(b for b in at.button if b.label=='Load example values').click().run()
    assert not at.button(key='run_diagnostic').disabled
    at.button(key='run_diagnostic').click().run();assert not at.exception
    assert len(at.session_state.diagnostic_result[2])==6

def test_upload_ui(frame):
    at=app().run()
    with patch('src.diagnostic_view.st.file_uploader',return_value=io.BytesIO(frame.to_csv(index=False).encode())):
        at.radio(key='diagnostic_mode').set_value('Upload CSV').run()
        at.button(key='run_diagnostic').click().run()
        assert not at.exception and len(at.session_state.diagnostic_result[2])==26
