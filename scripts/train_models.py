import sys,json,time,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np,pandas as pd,joblib
from sklearn.dummy import DummyRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor,HistGradientBoostingRegressor,HistGradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import precision_score,recall_score,f1_score,roc_auc_score,average_precision_score,confusion_matrix,brier_score_loss
from src.config import ROOT,SEED,RUL_CAP
from src.data_loader import read_raw
from src.features import make_features,targets
from src.evaluation import regression_metrics
from src.inference import predict

def endpoints(df,units,seed):
    rng=np.random.default_rng(seed)
    return [int(rng.choice(df.index[(df.unit==u)&(df.cycle>=40)])) for u in units]

def main():
    d=read_raw(); test=read_raw('test'); rng=np.random.default_rng(SEED)
    units=rng.permutation(d.unit.unique()); train,val,cal=units[:60],units[60:80],units[80:]
    mask=d.unit.isin(train)
    sensors=[s for s in d if s.startswith('s') and d.loc[mask,s].std()>1e-8]
    x=make_features(d,sensors); y=targets(d); yc=y.clip(upper=RUL_CAP)
    vi=endpoints(d,val,43); ci=endpoints(d,cal,44)
    models={'Median baseline':DummyRegressor(strategy='median'),'Ridge':make_pipeline(StandardScaler(),Ridge(alpha=20)), 'Random forest':RandomForestRegressor(n_estimators=100,max_depth=12,min_samples_leaf=8,n_jobs=2,random_state=SEED),'Gradient boosting':HistGradientBoostingRegressor(max_iter=180,max_leaf_nodes=15,l2_regularization=10,early_stopping=False,random_state=SEED)}
    scores=[]
    for name,m in models.items():
        t=time.perf_counter(); m.fit(x.loc[mask],yc.loc[mask]); p=np.maximum(0,m.predict(x.loc[vi]))
        scores.append({'model':name,**regression_metrics(y.loc[vi],p),'fit_seconds':time.perf_counter()-t}); print(scores[-1],flush=True)
    winner=min(scores,key=lambda r:r['RMSE'])['model']; m=models[winner]
    residual=np.abs(y.loc[ci]-np.maximum(0,m.predict(x.loc[ci])))
    # Split conformal, one endpoint per independent calibration engine; 80% marginal target.
    radius=float(np.sort(residual)[min(len(ci)-1,int(np.ceil((len(ci)+1)*.8))-1)])
    clf=HistGradientBoostingClassifier(max_iter=120,max_leaf_nodes=10,l2_regularization=15,early_stopping=False,random_state=SEED)
    clf.fit(x.loc[mask],(y.loc[mask]<=30).astype(int))
    bundle={'model':m,'classifier':clf,'sensors':sensors,'radius':radius,'selected':winner,'features':list(x.columns)}
    joblib.dump(bundle,ROOT/'artifacts/models/bundle.joblib',compress=3)
    hist=predict(test,bundle); fleet=hist.groupby('unit').tail(1).copy()
    truth=pd.read_csv(ROOT/'data/raw/RUL_FD001.txt',header=None)[0].to_numpy()
    fleet['actual_rul']=truth
    evals=regression_metrics(truth,fleet.rul)
    prob=fleet.failure_probability; binary=truth<=30; predicted=prob>=.5
    classification={'precision':precision_score(binary,predicted,zero_division=0),'recall':recall_score(binary,predicted,zero_division=0),'F1':f1_score(binary,predicted,zero_division=0),'ROC_AUC':roc_auc_score(binary,prob),'PR_AUC':average_precision_score(binary,prob),'Brier':brier_score_loss(binary,prob),'confusion_matrix':confusion_matrix(binary,predicted).tolist()}
    coverage=float(((truth>=fleet.lower)&(truth<=fleet.upper)).mean())
    imp=permutation_importance(m,x.loc[vi],y.loc[vi],scoring='neg_mean_absolute_error',n_repeats=5,random_state=SEED,n_jobs=1)
    pd.DataFrame({'feature':x.columns,'importance':imp.importances_mean,'std':imp.importances_std}).sort_values('importance',ascending=False).to_csv(ROOT/'artifacts/metrics/importance.csv',index=False)
    pd.DataFrame(scores).to_csv(ROOT/'artifacts/metrics/comparison.csv',index=False)
    result={'selected':winner,'test_raw':evals,'test_capped':regression_metrics(np.minimum(truth,RUL_CAP),fleet.rul),'classification':classification,'interval':{'nominal_coverage':.8,'test_coverage':coverage,'radius':radius,'calibration_engines':20},'split':{'train':train.tolist(),'validation':val.tolist(),'calibration':cal.tolist()},'validation_endpoints':vi,'calibration_endpoints':ci,'features':list(x.columns),'sensors':sensors,'train_rows':len(d),'test_rows':len(test),'seed':SEED,'rul_cap':RUL_CAP}
    (ROOT/'artifacts/metrics/results.json').write_text(json.dumps(result,indent=2))
    hist.to_csv(ROOT/'data/processed/history.csv.gz',index=False)
    fleet.to_csv(ROOT/'data/processed/fleet.csv',index=False)
    test.to_csv(ROOT/'data/processed/sensors.csv.gz',index=False)
    quality={'missing':int(d.isna().sum().sum()),'duplicate_cycles':int(d.duplicated(['unit','cycle']).sum()),'train_engines':int(d.unit.nunique()),'test_engines':int(test.unit.nunique()),'train_rows':len(d),'test_rows':len(test),'excluded_sensors':[f's{i}' for i in range(1,22) if f's{i}' not in sensors],'lifetime_summary':d.groupby('unit').cycle.max().describe().to_dict(),'settings_std':d[['op1','op2','op3']].std().to_dict()}
    (ROOT/'artifacts/metrics/quality.json').write_text(json.dumps(quality,indent=2))
    print(json.dumps(result['test_raw']),flush=True)
if __name__=='__main__': main()
