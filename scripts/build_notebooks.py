"""Create executable notebooks and evaluate cells in-order with captured real outputs."""
import sys,json,io,contextlib,os
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import nbformat as nb
from src.config import ROOT
os.chdir(ROOT)
setup="""from pathlib import Path
import sys, json
ROOT = Path.cwd() if (Path.cwd() / 'app.py').exists() else Path.cwd().parent
sys.path.insert(0, str(ROOT))
import pandas as pd
import numpy as np
from src.data_loader import read_raw
from src.features import make_features, targets
train = read_raw()
test = read_raw('test')
results = json.loads((ROOT / 'artifacts/metrics/results.json').read_text())
"""
specs=[('01_data_understanding','Understanding FD001','Understand what an engine cycle represents and distinguish run-to-failure training data from truncated test data.',"""print('Train shape:', train.shape, 'Test shape:', test.shape)
print('Unique train engines:', train.unit.nunique())
print('Missing values:', train.isna().sum().sum())
print('Duplicate engine-cycle rows:', train.duplicated(['unit','cycle']).sum())
print(train.head(3).to_string(index=False))""",'The unit is an engine trajectory, not an aircraft. Test series stop before failure; their last cycle cannot be used as a failure label.'),('02_eda','Sensor histories and lifetime variation','Inspect lifetime variation, constant channels and sensor correlation before modeling.',"""life=train.groupby('unit').cycle.max()
print(life.describe().to_string())
print('Sensor standard deviations:')
print(train[[f's{i}' for i in range(1,22)]].std().round(5).to_string())
print('Selected correlations:')
print(train[['s4','s11','s12','s15']].corr().round(3).to_string())
import plotly.express as px
fig=px.line(train.query('unit in [1,2,3]'),x='cycle',y='s4',color='unit',title='Sensor 4: three run-to-failure histories')
fig.update_layout(template='plotly_white')""",'Lifetimes and sensor histories differ between engines. Constant channels cannot help a predictive split. Correlation does not identify a physical cause.'),('03_feature_engineering','Causal features and independent engines','Verify temporal ordering, construct RUL and inspect the retained feature matrix.',"""y=targets(train)
x=make_features(train,results['sensors'])
print('Feature shape:',x.shape)
print('RUL range:',y.min(),y.max())
print('Training cap:',results['rul_cap'])
print(x.head(3).to_string(index=False))
a,b,c=[set(results['split'][k]) for k in ['train','validation','calibration']]
assert not a&b and not a&c and not b&c
print('Engine counts:',len(a),len(b),len(c))""",'All windows use current and past values within one engine. The saved split excludes all shared engines between fit, selection and interval calibration.'),('04_modeling','Model selection and operational interpretation','Read actual selection evidence and independently recompute official endpoint metrics.',"""from src.evaluation import regression_metrics
fleet=pd.read_csv(ROOT/'data/processed/fleet.csv')
print(pd.read_csv(ROOT/'artifacts/metrics/comparison.csv').to_string(index=False))
print('Selected:',results['selected'])
print('Uncapped test:',regression_metrics(fleet.actual_rul,fleet.rul))
print('Interval:',results['interval'])
print('Classification:',results['classification'])
import plotly.express as px
fig=px.scatter(fleet,x='actual_rul',y='rul',color='risk',hover_name='engine',title='Official endpoint prediction versus truth')
fig.update_layout(template='plotly_white')""",'Test results are reported only after model selection. Wide intervals explain high observed coverage; neither test accuracy nor coverage establishes real aircraft safety.')]
for name,title,objective,code,conclusion in specs:
    cells=[nb.v4.new_markdown_cell(f'# {title}\n\n## Objective\n{objective}\n\n## Method\nUse the official FD001 files and saved engine-separated artifacts. Rebuild training with `python scripts/train_models.py` before rerunning if configuration changes.'),nb.v4.new_code_cell(setup),nb.v4.new_code_cell(code),nb.v4.new_markdown_cell('## Interpretation and conclusion\n'+conclusion)]
    notebook=nb.v4.new_notebook(cells=cells,metadata={'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'}})
    env={}; count=0
    for cell in notebook.cells:
        if cell.cell_type!='code':continue
        count+=1;stream=io.StringIO()
        with contextlib.redirect_stdout(stream):exec(compile(cell.source,name,'exec'),env)
        cell.execution_count=count
        cell.outputs=[nb.v4.new_output('stream',name='stdout',text=stream.getvalue())] if stream.getvalue() else []
        if 'fig' in env:
            figure=env.pop('fig');cell.outputs.append(nb.v4.new_output('display_data',data={'application/vnd.plotly.v1+json':json.loads(figure.to_json()),'text/plain':'Interactive Plotly figure'},metadata={}))
    nb.write(notebook,ROOT/f'notebooks/{name}.ipynb');print(name,'executed')
