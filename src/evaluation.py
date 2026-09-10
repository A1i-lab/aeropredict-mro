import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def regression_metrics(y,p):
    e = np.asarray(p)-np.asarray(y)
    return {'MAE':float(mean_absolute_error(y,p)), 'RMSE':float(np.sqrt(mean_squared_error(y,p))), 'R2':float(r2_score(y,p)), 'NASA_score':float(np.where(e<0,np.expm1(-e/13),np.expm1(e/10)).sum())}
