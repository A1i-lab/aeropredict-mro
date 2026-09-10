import pandas as pd

def make_features(df, sensors):
    """Causal transformations. No target or engine identifier enters X."""
    df = df.sort_values(['unit','cycle']).copy()
    out = df[['cycle'] + sensors].copy()
    for s in sensors:
        g = df.groupby('unit')[s]
        out[s+'_mean10'] = g.transform(lambda x: x.rolling(10,min_periods=1).mean())
        out[s+'_std10'] = g.transform(lambda x: x.rolling(10,min_periods=1).std(ddof=0))
        out[s+'_delta5'] = g.diff(5).fillna(0) / 5
    return out

def targets(df):
    return df.groupby('unit').cycle.transform('max') - df.cycle
