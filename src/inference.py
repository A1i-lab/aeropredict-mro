import numpy as np
from .features import make_features
from .business_rules import decisions

def predict(df, bundle):
    x = make_features(df,bundle['sensors'])
    p = np.maximum(0,bundle['model'].predict(x))
    out = df[['unit','cycle']].copy()
    out['rul'] = p
    out['lower'] = np.maximum(0,p-bundle['radius'])
    out['upper'] = p+bundle['radius']
    out['failure_probability'] = bundle['classifier'].predict_proba(x)[:,1]
    return decisions(out)
