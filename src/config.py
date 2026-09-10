from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SEED = 42
RUL_CAP = 125
CRITICAL_RUL = 20
WATCH_RUL = 50
RISK_HORIZON = 30
COLUMNS = ['unit', 'cycle'] + [f'op{i}' for i in range(1,4)] + [f's{i}' for i in range(1,22)]
DISCLAIMER = 'Academic predictive-maintenance demonstrator inspired by publicly described MRO predictive-maintenance principles. Built exclusively with the public NASA C-MAPSS dataset. This project is not affiliated with Air France-KLM or AFI KLM E&M and does not reproduce PROGNOS proprietary algorithms.'
