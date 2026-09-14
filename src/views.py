from .diagnostic_view import diagnostic
import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from .ui import hero,kpis,notice,chart,table,chip,COLORS
from .config import DISCLAIMER,ROOT

def overview(f,h,s,m):
    hero('See the risk.<br>Stay ahead.', 'Engine health, remaining life and inspection priorities. One clear view of your simulated fleet.')
    n=f.risk.value_counts()
    kpis([('ENGINES MONITORED',len(f),'Latest available cycle per engine','#2878E8'),('HEALTHY',n.get('HEALTHY',0),'Continue routine monitoring',COLORS['HEALTHY']),('WATCH',n.get('WATCH',0),'Plan an inspection review',COLORS['WATCH']),('CRITICAL',n.get('CRITICAL',0),'Prioritize engineering review',COLORS['CRITICAL'])])
    notice(f"<b>{int((f.risk!='HEALTHY').sum())} engines require attention.</b> Mean predicted remaining life: <b>{f.rul.mean():.0f} cycles</b>. Review the shortest remaining-life estimates first. This is a dataset snapshot, not a live fleet.")
    a,b=st.columns([1,1.65])
    with a,st.container(border=True):
        st.subheader('Fleet health balance'); st.caption('Risk levels derived from predicted remaining life')
        fig=go.Figure(go.Pie(labels=['HEALTHY','WATCH','CRITICAL'],values=[n.get(k,0) for k in COLORS],hole=.78,marker_colors=list(COLORS.values()),textinfo='none',sort=False))
        fig.update_layout(annotations=[dict(text=f'<b>{len(f)}</b><br>engines',x=.5,y=.5,font_size=24,showarrow=False)],showlegend=True)
        chart(fig,240)
    with b,st.container(border=True):
        st.subheader('Remaining life across the fleet'); st.caption('Each dot is an engine. Color shows its current review category.')
        chart(px.scatter(f,x='cycle',y='rul',color='risk',color_discrete_map=COLORS,hover_name='engine',hover_data={'lower':':.1f','upper':':.1f'},labels={'cycle':'Observed engine cycles','rul':'Predicted RUL (cycles)','risk':''}).update_traces(marker_size=9,marker_line_width=1,marker_line_color='white'),240)
    st.subheader('Top priority engines')
    st.caption('Ranked by the lower prediction bound. Open Engine Health to review the full history. Click a column heading to sort.')
    table(f.sort_values(['priority','rul'],ascending=[False,True]).head(10))
    with st.expander('Explore the full fleet and RUL distribution'):
        r=st.multiselect('Risk categories',list(COLORS),default=list(COLORS),key='fleet_risk')
        table(f[f.risk.isin(r)])
        chart(px.histogram(f,x='rul',nbins=20,labels={'rul':'Predicted RUL (cycles)'}))

def engine(f,h,s,m):
    st.title('Engine Health'); st.caption('A focused review of remaining life, uncertainty and sensor history.')
    name=st.selectbox('Select engine',f.engine.tolist(),index=int(f.rul.argmin()))
    row=f[f.engine==name].iloc[0]; history=h[h.engine==name]; sensors=s[s.unit==row.unit]
    a,b=st.columns([1.1,1.9])
    with a,st.container(border=True):
        st.markdown(f'<div class="eyebrow">{name} / CYCLE {int(row.cycle)}</div>{chip(row.risk)}',unsafe_allow_html=True)
        st.markdown(f'<div class="big-rul">{row.rul:.0f} <span>cycles</span></div>',unsafe_allow_html=True)
        st.caption('PREDICTED REMAINING USEFUL LIFE')
        st.markdown(f'**Estimated range: {row.lower:.0f} to {row.upper:.0f} cycles**')
        st.caption('80% nominal marginal prediction interval. Actual coverage is reported under Model Performance.')
        st.divider(); st.markdown(f'**{row.action}**'); st.caption(f'Risk rule: critical at RUL ≤ 20, watch at RUL ≤ 50. Current estimate: {row.rul:.1f} cycles.')
    with b,st.container(border=True):
        st.subheader('Remaining-life trajectory')
        fig=go.Figure()
        fig.add_scatter(x=history.cycle,y=history.upper,line_width=0,showlegend=False,hoverinfo='skip')
        fig.add_scatter(x=history.cycle,y=history.lower,fill='tonexty',fillcolor='rgba(40,120,232,.12)',line_width=0,name='Estimated interval')
        fig.add_scatter(x=history.cycle,y=history.rul,name='Predicted RUL',line=dict(color='#2878E8',width=2.5))
        fig.add_hline(y=20,line_dash='dot',line_color=COLORS['CRITICAL'])
        fig.update_layout(xaxis_title='Observed cycle',yaxis_title='Remaining cycles')
        chart(fig,300)
    kpis([('SYNTHETIC HEALTH',f'{row.health:.0f}/100','Linear rescaling of predicted RUL','#2878E8'),('30-CYCLE MODEL PROBABILITY',f'{row.failure_probability:.0%}','Uncalibrated classification output','#7DADC9'),('PRIORITY SCORE',f'{row.priority:.0f}/100','Based on the lower RUL bound',COLORS[row.risk])])
    st.subheader('Sensor evidence'); st.caption('Raw measurements with a trailing 10-cycle mean. Trends are observations, not causal explanations of a physical fault.')
    selected=st.multiselect('Sensors',m['sensors'],default=['s4','s11'],max_selections=4)
    cols=st.columns(2)
    for i,sensor in enumerate(selected):
        with cols[i%2],st.container(border=True):
            st.markdown(f'**{sensor.upper()} / measured trajectory**')
            fig=go.Figure(); fig.add_scatter(x=sensors.cycle,y=sensors[sensor],name='Raw',line=dict(color='#B4C5D7',width=1)); fig.add_scatter(x=sensors.cycle,y=sensors[sensor].rolling(10,min_periods=1).mean(),name='Trailing mean',line=dict(color='#2878E8',width=2))
            fig.update_layout(xaxis_title='Cycle',yaxis_title='Dataset sensor units');chart(fig,240)
    with st.expander('Historical evaluation: revealed NASA endpoint truth'):
        st.write(f'Official remaining life at this endpoint: **{row.actual_rul:.0f} cycles**. Prediction error: **{row.rul-row.actual_rul:+.1f} cycles**.')
        st.caption('Truth is used only for evaluation, never to generate the prediction or priority.')

def alerts(f,h,s,m):
    st.title('Prognostics & Alerts'); st.caption('A prioritized review queue. These are simulated endpoint alerts, not live notifications.')
    a,b,c=st.columns([1,1,1.2]); risk=a.multiselect('Risk level',list(COLORS),default=['CRITICAL','WATCH']); maximum=b.slider('Maximum predicted RUL',0,200,100); query=c.text_input('Find engine',placeholder='ENG-034')
    filtered=f[f.risk.isin(risk)&f.rul.le(maximum)&f.engine.str.contains(query.upper(),regex=False)].sort_values('rul')
    kpis([('IN THIS QUEUE',len(filtered),'Engines matching your filters','#2878E8'),('PRIORITY REVIEW',int((filtered.risk=='CRITICAL').sum()),'Predicted RUL at or below 20',COLORS['CRITICAL']),('INSPECTION PLANNING',int((filtered.risk=='WATCH').sum()),'Predicted RUL between 20 and 50',COLORS['WATCH'])])
    st.write('')
    if filtered.empty: st.info('No engines match these filters. Widen the RUL range or select another risk level.')
    for _,r in filtered.iterrows():
        st.markdown(f'''<div class="alert" style="--accent:{COLORS[r.risk]}"><div><strong>{r.engine}</strong><p>{chip(r.risk)}</p><small>Snapshot at cycle {int(r.cycle)}</small></div><div><strong>{r.rul:.0f} cycles remaining</strong><p>Estimated range {r.lower:.0f} to {r.upper:.0f} cycles</p><small>Reason: RUL threshold rule</small></div><div><strong>{r.action}</strong><p>30-cycle model probability: {r.failure_probability:.0%}</p><small>Probability is not a confidence rating</small></div></div>''',unsafe_allow_html=True)
    st.caption('Prediction intervals target 80% marginal coverage. A narrow interval is not a safety guarantee.')

def planner(f,h,s,m):
    st.title('Maintenance Planner'); st.caption('Turn remaining-life estimates into a clear inspection review order.')
    n=st.slider('Review capacity (engines)',1,len(f),10)
    ordered=f.sort_values(['priority','rul'],ascending=[False,True]); selected=ordered.head(n)
    kpis([('PLANNED REVIEWS',n,'Your selected review capacity','#2878E8'),('CRITICAL IN PLAN',int((selected.risk=='CRITICAL').sum()),'Review with an engineer',COLORS['CRITICAL']),('SHORTEST RUL',f'{selected.rul.min():.0f}','Predicted remaining cycles','#7DADC9')])
    notice('Priority = 100 × (1 - clipped lower RUL bound / 125). Lower bounds are clipped to 0-125. Ties are broken by predicted RUL. Capacity is a scenario input, not a maintenance schedule.')
    a,b=st.columns([1.35,1])
    with a,st.container(border=True):
        st.subheader('Inspection priority order')
        chart(px.bar(selected.sort_values('priority'),x='priority',y='engine',orientation='h',color='risk',color_discrete_map=COLORS,labels={'priority':'Maintenance priority score','engine':'','risk':''}),min(450,130+n*22))
    with b,st.container(border=True):
        st.subheader('Review priority matrix'); st.caption('High model probability and short RUL warrant closer review.')
        fig=px.scatter(f,x='rul',y='failure_probability',color='risk',hover_name='engine',color_discrete_map=COLORS,labels={'rul':'Predicted RUL (cycles)','failure_probability':'P(RUL ≤ 30)','risk':''});fig.update_yaxes(tickformat='.0%'); chart(fig,min(450,130+n*22))
    st.subheader('Proposed review list');table(selected)
    export=selected.drop(columns=['actual_rul']).copy();export.insert(0,'rank',range(1,len(export)+1))
    st.download_button('Download review plan .csv',export.to_csv(index=False).encode(),'aeropredict-review-plan.csv','text/csv',type='primary')

def performance(f,h,s,m):
    st.title('Model Performance'); st.caption('Measured on 100 official FD001 test endpoints. Test truth is uncapped unless stated otherwise.')
    metrics=m['test_raw']; kpis([('MEAN ABSOLUTE ERROR',f"{metrics['MAE']:.1f}",'Cycles, lower is better','#2878E8'),('ROOT MEAN SQUARED ERROR',f"{metrics['RMSE']:.1f}",'Cycles, penalizes large errors','#2878E8'),('R²',f"{metrics['R2']:.3f}",'Explained variation against test truth','#7DADC9'),('INTERVAL COVERAGE',f"{m['interval']['test_coverage']:.0%}",'Observed test coverage, target 80%','#16826C')])
    notice(f"<b>Selected model: {m['selected']}.</b> Chosen by lowest RMSE on 20 separate validation engines. The official test set was evaluated after selection. A single small validation split limits the stability of the ranking.")
    with st.container(border=True):
        st.subheader('Model selection evidence')
        comp=pd.read_csv(ROOT/'artifacts/metrics/comparison.csv'); st.caption('Validation endpoints, uncapped truth. These are not test metrics.')
        st.dataframe(comp.style.format(precision=2),hide_index=True,width='stretch')
    a,b=st.columns(2)
    with a,st.container(border=True):
        st.subheader('Prediction versus observed remaining life')
        fig=px.scatter(f,x='actual_rul',y='rul',color='risk',color_discrete_map=COLORS,hover_name='engine',labels={'actual_rul':'Official RUL (cycles)','rul':'Predicted RUL (cycles)','risk':''}); fig.add_shape(type='line',x0=0,y0=0,x1=160,y1=160,line=dict(color='#8796A8',dash='dot'));chart(fig)
    with b,st.container(border=True):
        st.subheader('Where the model misses')
        chart(px.histogram(x=f.rul-f.actual_rul,nbins=20,labels={'x':'Prediction minus truth (cycles)','y':'Engine count'}))
        st.caption('Positive errors overestimate remaining life. Negative errors underestimate it.')
    st.subheader('What this means for operations')
    st.write(f"The average absolute miss is {metrics['MAE']:.1f} cycles on this simulated test set. Use the output to rank engineering reviews, not to authorize operation. Early-life predictions are constrained by the 125-cycle training cap, and can underestimate engines with long remaining life.")
    with st.expander('Classification, uncertainty and explainability details'):
        c=m['classification']; st.write({k:round(v,3) for k,v in c.items() if k!='confusion_matrix'})
        st.caption('Classifier target: true RUL ≤ 30. Decision threshold: 0.5. PR-AUC is average precision. Probabilities have not been calibrated and do not drive the RUL status rules.')
        st.dataframe(pd.DataFrame(c['confusion_matrix'],index=['Actual >30','Actual ≤30'],columns=['Predicted >30','Predicted ≤30']))
        st.write('Recall measures the share of short-life endpoints detected. Missed critical cases matter, but high recall alone does not establish operational reliability.')
        st.write(f"Interval radius: {m['interval']['radius']:.1f} cycles. Split-conformal calibration on 20 independent engines, one randomly truncated endpoint each. The 80% target is marginal under exchangeability, not per-engine certainty. Official test truncation can differ from calibration truncation.")
        importance=pd.read_csv(ROOT/'artifacts/metrics/importance.csv').head(10)
        chart(px.bar(importance.sort_values('importance'),x='importance',y='feature',orientation='h',error_x='std',labels={'importance':'Validation MAE increase after permutation','feature':''}),330)
        st.caption('Global permutation importance on only 20 endpoints. Correlated features share information; this is neither local attribution nor physical causality.')
        st.write('Uncapped NASA asymmetric score:',round(metrics['NASA_score'],1));st.json(m['test_capped'])

def transparency(f,h,s,m):
    st.title('Data & Model Transparency'); st.caption('Trace every decision back to its data, transformation and rule.')
    kpis([('TRAIN TRAJECTORIES',100,'60 training / 20 validation / 20 calibration','#2878E8'),('TRAIN OBSERVATIONS',f"{m['train_rows']:,}",'Run-to-failure engine cycles','#7DADC9'),('RETAINED SENSORS',len(m['sensors']),'Nonconstant in training engines','#16826C')])
    steps=[('01','Public data','NASA FD001, one operating condition and HPC degradation.'),('02','Quality controls','Validate schema, duplicate cycles and missing values.'),('03','Causal features','Current sensors, trailing means, dispersion and deltas.'),('04','Prediction','RUL regression and a separate 30-cycle classifier.'),('05','Uncertainty','Independent engine-level interval calibration.'),('06','Decision support','Transparent RUL status rules and inspection ranking.')]
    st.markdown('<div class="pipeline">'+''.join(f'<div class="step"><span class="eyebrow">{n}</span><b>{title}</b><small>{body}</small></div>' for n,title,body in steps)+'</div>',unsafe_allow_html=True)
    a,b=st.columns(2)
    with a,st.container(border=True):
        st.subheader('Leakage controls')
        st.write('Training, validation and calibration engine IDs are disjoint. Features use only the current and previous observations. Sensor selection and scaling use training engines only. Engine IDs and RUL truth never enter model features.')
        st.write('The production artifact retains the 60-engine fit. It is not refitted after calibration.')
    with b,st.container(border=True):
        st.subheader('Scope and limitations')
        st.write('Simulated engine data. No aircraft registrations, live feeds, dates, financial savings or fleet availability claims. Engine endpoint cycles are not synchronized calendar time.')
        st.write('Health = 100 × predicted RUL / 125, clipped to 0-100. It is a synthetic decision-support score, not a certified condition measurement.')
    with st.expander('Data quality report and feature list'):
        st.json((ROOT/'artifacts/metrics/quality.json').read_text());st.write(m['features'])
    st.markdown('[NASA source and dataset citation](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/)')

def about(f,h,s,m):
    hero('A clearer path<br>from signal to action.', 'AeroPredict MRO is an independent academic exploration of predictive engine maintenance.', 'AEROPREDICT MRO / PRODUCT & PURPOSE')
    a,b=st.columns([1.4,1])
    with a,st.container(border=True):
        st.subheader('Built around one operational question')
        st.write('Which engines should an engineering team review first, and why? AeroPredict translates public sensor histories into remaining-life estimates, transparent review categories and an ordered inspection list.')
        st.write('The academic objective is to demonstrate the full data product lifecycle: ingestion, causal feature engineering, engine-separated evaluation, uncertainty, decision rules and a usable interface.')
    with b,st.container(border=True):
        st.subheader('Independent by design')
        st.write('Public descriptions of predictive MRO platforms, including PROGNOS, inspire the operational framing. This project does not replicate their interfaces, proprietary models or industrial capabilities.')
    st.subheader('Engineering architecture')
    st.write('Offline Python training produces versioned model artifacts and prepared endpoint histories. Streamlit loads cached outputs. No model training, external API key or raw data download occurs when the application starts.')
    st.caption('PYTHON / PANDAS / SCIKIT-LEARN / PLOTLY / STREAMLIT / PYTEST')
    notice(DISCLAIMER)
    st.markdown('[NASA C-MAPSS repository](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/) · [Public PROGNOS presentation by AFI KLM E&M](https://vimeo.com/220937470) · [Streamlit deployment documentation](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app)')
    st.caption('Original AI-generated aircraft illustration, used only for visual context. Code: MIT. Dataset: NASA source terms. No real aircraft safety decisions.')

VIEWS={'Fleet Overview':overview,'Engine Health':engine,'Predictive Diagnostic':diagnostic,'Prognostics & Alerts':alerts,'Maintenance Planner':planner,'Model Performance':performance,'Data & Model Transparency':transparency,'About':about}
