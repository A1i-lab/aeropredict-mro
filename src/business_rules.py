import numpy as np
from .config import RUL_CAP, CRITICAL_RUL, WATCH_RUL

def decisions(df):
    d = df.copy()
    d['health'] = (100*d.rul/RUL_CAP).clip(0,100)
    d['risk'] = np.select([d.rul.le(CRITICAL_RUL),d.rul.le(WATCH_RUL)], ['CRITICAL','WATCH'], default='HEALTHY')
    d['action'] = d.risk.map({'CRITICAL':'Priority inspection','WATCH':'Schedule inspection','HEALTHY':'Monitor'})
    # RUL already determines health, so do not count it twice.
    d['priority'] = 100*(1-d.lower.clip(0,RUL_CAP)/RUL_CAP)
    d['engine'] = d.unit.map(lambda x: f'ENG-{int(x):03d}')
    return d
