"""Validated single-engine inference sandbox. Never trains or alters evaluation."""
from io import StringIO
import json
import numpy as np
import pandas as pd
from .config import ROOT
from .data_loader import read_raw
from .inference import predict

MAX_ROWS = 5000

def template(sensors):
    return pd.DataFrame({'cycle': range(1, 11), **{s: [np.nan]*10 for s in sensors}})

def parse_csv(data):
    if len(data) > 5_000_000:
        raise ValueError('CSV exceeds the 5 MB limit.')
    import csv
    text = data.decode('utf-8-sig')
    header = next(csv.reader(StringIO(text)), [])
    if len(header) != len(set(header)):
        raise ValueError('Duplicate column names are not allowed.')
    return pd.read_csv(StringIO(text))

def validate(frame, sensors):
    errors, warnings = [], []
    required = ['cycle', *sensors]
    if not frame.columns.is_unique:
        return None, ['Duplicate column names are not allowed.'], []
    missing = [s for s in required if s not in frame]
    extra = [s for s in frame if s not in required + ['engine_id']]
    if missing: errors.append('Missing required columns: '+', '.join(missing))
    if extra: errors.append('Unexpected columns: '+', '.join(map(str, extra))+'. Supply observations only, not prediction targets.')
    if not 5 <= len(frame) <= MAX_ROWS:
        errors.append(f'Provide 5 to {MAX_ROWS} observations for one engine.')
    if 'engine_id' in frame and (frame.engine_id.isna().any() or frame.engine_id.astype(str).str.strip().eq('').any() or frame.engine_id.nunique()!=1):
        errors.append('engine_id must identify exactly one engine with no missing IDs.')
    if errors: return None, errors, warnings
    if any(frame[c].map(lambda v: isinstance(v, (bool, np.bool_))).any() for c in required):
        return None, ['Boolean values are not sensor measurements or cycle numbers.'], warnings
    out = frame[required].apply(pd.to_numeric, errors='coerce')
    if not np.isfinite(out.to_numpy(dtype=float)).all():
        return None, ['Every required value must be numeric, finite and non-missing.'], warnings
    if (out.cycle <= 0).any() or (out.cycle % 1 != 0).any(): errors.append('Cycles must be positive whole numbers.')
    if out.cycle.duplicated().any(): errors.append('Duplicate cycles are ambiguous. Remove the duplicate before inference.')
    if not out.cycle.is_monotonic_increasing: warnings.append('Observations were sorted by cycle.')
    out = out.sort_values('cycle').reset_index(drop=True)
    if len(out)>1 and not out.cycle.diff().iloc[1:].eq(1).all(): errors.append('Provide consecutive cycles. Gaps would change the meaning of the trained rolling features.')
    if len(out)<10: warnings.append('Limited history: fewer than 10 observations. Rolling statistics have less context; the first five 5-cycle deltas use the existing pipeline’s zero fallback.')
    if errors: return None, errors, warnings
    out['cycle'] = out.cycle.astype(int)
    out.insert(0, 'unit', 1)
    return out, errors, warnings

def training_reference(sensors):
    split = json.loads((ROOT/'artifacts/metrics/results.json').read_text())['split']['train']
    data = read_raw('train')
    return data.loc[data.unit.isin(split), sensors].agg(['min','max',lambda x: x.quantile(.01),lambda x: x.quantile(.99)]).set_axis(['min','max','p01','p99'])

def compatibility(frame, sensors, bounds):
    x = frame[sensors]
    unusual = (x.lt(bounds.loc['p01']) | x.gt(bounds.loc['p99']))
    outside = (x.lt(bounds.loc['min']) | x.gt(bounds.loc['max']))
    state = 'OUTSIDE TRAINING DOMAIN' if outside.any().any() else 'UNUSUAL VALUES DETECTED' if unusual.any().any() else 'NORMAL RANGE'
    return state, pd.DataFrame({'sensor': sensors, 'unusual_observations': unusual.sum().to_numpy(), 'outside_training_range': outside.sum().to_numpy()})

def run_diagnostic(frame, bundle, engine_id='NEW-ENGINE-001'):
    clean, errors, warnings = validate(frame, bundle['sensors'])
    if errors: raise ValueError(' '.join(errors))
    # Sorted/reset first: predict assigns numpy outputs positionally after make_features sorts.
    result = predict(clean, bundle)
    # Early rows retain their causal context but are not presented as sufficient-history diagnoses.
    result = result.iloc[4:].copy()
    result['engine'] = str(engine_id)
    return clean, result, warnings

def load_demo():
    return pd.read_csv(ROOT/'data/synthetic/diagnostic_engines.csv')
