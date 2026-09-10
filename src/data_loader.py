import pandas as pd
from .config import ROOT, COLUMNS

def read_raw(split='train'):
    df = pd.read_csv(ROOT / f'data/raw/{split}_FD001.txt', sep=r'\s+', header=None, names=COLUMNS)
    if df.isna().any().any() or df.duplicated(['unit','cycle']).any():
        raise ValueError('Missing values or duplicate engine cycles')
    if (df[['unit','cycle']] < 1).any().any():
        raise ValueError('Invalid identifiers')
    return df.sort_values(['unit','cycle']).reset_index(drop=True)
