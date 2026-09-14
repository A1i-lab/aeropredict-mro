"""Interactive inference page, separate from benchmark Engine Health."""
import hashlib
import joblib
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from .config import ROOT
from .features import make_features
from .diagnostic import template, parse_csv, validate, training_reference, compatibility, run_diagnostic, load_demo
from .ui import chart, kpis, COLORS, chip

@st.cache_resource
def model_bundle():
    return joblib.load(ROOT/'artifacts/models/bundle.joblib')

@st.cache_data
def reference(sensors):
    return training_reference(list(sensors))

@st.cache_data
def demos():
    return load_demo()

def diagnostic(*_):
    st.title('Predictive Diagnostic')
    st.caption('NEW ENGINE PROGNOSTICS / Submit observations. Run the trained model. Review uncertainty.')
    st.info('Academic demonstrator trained on public NASA C-MAPSS simulated turbofan data. Never use these predictions to authorize operation of a real aircraft. No affiliation with Air France, KLM, AFI KLM E&M, Airbus, NASA or PROGNOS; NASA is credited only as the dataset source.')
    bundle=model_bundle(); sensors=bundle['sensors']; examples=demos()
    mode=st.radio('Input mode',['Demo engine','Manual entry','Upload CSV'],horizontal=True,key='diagnostic_mode')
    engine_id='NEW-ENGINE-001'; frame=None
    if mode=='Demo engine':
        st.caption('SYNTHETIC / DEMONSTRATION DATA. Training-derived histories with small bounded perturbations, not independent benchmark engines.')
        engine_id=st.selectbox('Demonstration engine',examples.engine_id.unique(),key='diagnostic_demo')
        frame=examples[examples.engine_id==engine_id].drop(columns='engine_id').reset_index(drop=True)
        with st.expander('Preview demonstration observations'):
            st.dataframe(frame,hide_index=True,width='stretch')
    elif mode=='Manual entry':
        engine_id=st.text_input('New engine ID',value='NEW-ENGINE-001',key='diagnostic_id')
        if 'diagnostic_editor_base' not in st.session_state:
            st.session_state.diagnostic_editor_base=template(sensors)
            st.session_state.diagnostic_editor_version=0
        if st.button('Load example values'):
            st.session_state.diagnostic_editor_base=examples[examples.engine_id==examples.engine_id.iloc[0]].tail(10).drop(columns='engine_id').reset_index(drop=True)
            st.session_state.diagnostic_editor_version+=1
        st.caption('One row per consecutive cycle. Edit, paste tabular values, add or delete rows. Example values are synthetic.')
        frame=st.data_editor(st.session_state.diagnostic_editor_base,num_rows='dynamic',hide_index=True,width='stretch',key=f'diagnostic_editor_{st.session_state.diagnostic_editor_version}')
    else:
        st.download_button('Download CSV template',template(sensors).to_csv(index=False).encode(),'aeropredict-engine-input-template.csv','text/csv')
        upload=st.file_uploader('Engine observations (.csv, UTF-8, maximum 5 MB)',type=['csv'],key='diagnostic_upload')
        if upload:
            try:
                frame=parse_csv(upload.getvalue())
                if 'engine_id' in frame and len(frame): engine_id=str(frame.engine_id.iloc[0])
                st.dataframe(frame.head(50),hide_index=True,width='stretch')
            except (ValueError,UnicodeError,pd.errors.ParserError) as error:
                st.error(f'Unable to read CSV: {error}')
    st.caption('Required: 5 or more consecutive observations; 10 or more recommended. No missing history is synthesized.')
    if frame is not None:
        clean, errors, warnings=validate(frame,sensors)
        if not engine_id.strip(): errors.append('Provide a non-empty engine ID.')
        with st.container(border=True):
            st.markdown('**INPUT QUALITY**')
            cols=st.columns(4)
            cols[0].metric('Observations',len(frame)); cols[1].metric('Missing cells',int(frame.isna().sum().sum()))
            cols[2].metric('First cycle',int(clean.cycle.min()) if clean is not None else '-')
            cols[3].metric('Latest cycle',int(clean.cycle.max()) if clean is not None else '-')
            for error in errors: st.error(error)
            for warning in warnings: st.warning(warning)
            if not errors:
                st.success('Schema valid. Ready for real model inference.')
                state, evidence=compatibility(clean,sensors,reference(tuple(sensors)))
                if state!='NORMAL RANGE':
                    st.warning(f'Input compatibility: {state}. {int(evidence.unusual_observations.sum())} sensor observations outside the common training range; {int(evidence.outside_training_range.sum())} outside observed training bounds. The model may extrapolate poorly.')
                else: st.caption('Input compatibility: NORMAL RANGE')
                with st.expander('Input compatibility details'):
                    st.dataframe(evidence,hide_index=True)
                    st.caption('Per-channel 1st/99th percentiles and min/max from the fitted training engines. This is not a certified anomaly detector or a multivariate domain guarantee.')
        fingerprint=hashlib.sha256((mode+'\n'+engine_id+'\n'+frame.to_csv(index=False)).encode()).hexdigest()
        if st.button('Run diagnostic',type='primary',disabled=bool(errors),key='run_diagnostic'):
            try:
                with st.spinner('Preparing causal features and running the saved model…'):
                    clean,result,_=run_diagnostic(frame,bundle,engine_id.strip())
                st.session_state.diagnostic_result=(fingerprint,clean,result)
            except (ValueError,KeyError) as error: st.error(f'Diagnostic could not run: {error}')
        saved=st.session_state.get('diagnostic_result')
        if saved and saved[0]==fingerprint and not errors:
            show_result(saved[1],saved[2],bundle)
        elif saved: st.caption('Inputs changed. Run diagnostic again to obtain an updated result.')
    with st.expander('Understand the input data'):
        st.write('One row represents one observed engine cycle. Cycle is a positive integer. Sensor channels are NASA C-MAPSS channels; no physical meanings are assumed here. Optional engine_id is metadata only. An internal unit=1 groups your history and never enters the model features.')
        st.write('Required sensors for this model: '+', '.join(sensors))
        st.write('CSV columns: cycle, '+', '.join(sensors)+'. Optional: engine_id. Supply one engine and consecutive cycles; target/output columns are rejected.')
        st.write('Engine Health reviews existing NASA benchmark engines. Predictive Diagnostic runs new inference on your submitted observations.')
    with st.expander('How AeroPredict prepares your data'):
        st.write('Current sensor measurement + trailing 10-observation mean + trailing 10-observation standard deviation + difference from five observations earlier divided by 5 + current cycle → saved regression/classification models.')
        st.caption('Statistics use only present/past observations. The first five delta values use the unchanged training pipeline’s zero fallback. Predictions are displayed from the fifth submitted observation onward; 10 observations are preferable.')
        if frame is not None:
            clean,errors,_=validate(frame,sensors)
            if not errors: st.dataframe(make_features(clean,sensors),hide_index=True,width='stretch')

def show_result(clean, result, bundle):
    latest=result.iloc[-1]
    st.divider()
    left,right=st.columns([1,1.6])
    with left,st.container(border=True):
        st.caption('ENGINE DIAGNOSTIC / LATEST OBSERVATION')
        st.subheader(str(latest.engine))
        st.caption(f'Cycle {int(latest.cycle)} · {bundle["selected"]}')
        st.markdown(chip(latest.risk),unsafe_allow_html=True)
        st.markdown(f'<div class="big-rul">{latest.rul:.1f} <span>cycles</span></div>',unsafe_allow_html=True)
        st.caption('RUL: estimated operational cycles remaining in this simulated-data domain.')
        st.write(f'**Estimated interval: {latest.lower:.1f} to {latest.upper:.1f} cycles**')
        st.caption('80% nominal marginal interval from the original calibration. Coverage is not guaranteed for uploaded or synthetic observations.')
        st.write('**'+latest.action+'**')
        st.caption('Decision-support suggestion, not an operational authorization. Critical: RUL ≤20; watch: RUL ≤50.')
    with right:
        st.subheader('Prediction over submitted history')
        fig=go.Figure()
        fig.add_scatter(x=result.cycle,y=result.upper,line_width=0,showlegend=False)
        fig.add_scatter(x=result.cycle,y=result.lower,fill='tonexty',fillcolor='rgba(40,120,232,.14)',line_width=0,name='Estimated interval')
        fig.add_scatter(x=result.cycle,y=result.rul,name='Predicted RUL',line=dict(color='#2878E8',width=3))
        fig.update_layout(xaxis_title='Observed cycle',yaxis_title='Remaining cycles');chart(fig,310)
    kpis([('HEALTH SCORE',f'{latest.health:.0f} / 100','Decision score: clipped 100 × RUL / 125','#2878E8'),('P(RUL ≤ 30)',f'{latest.failure_probability:.1%}','Uncalibrated classifier estimate','#7DADC9'),('MAINTENANCE PRIORITY',f'{latest.priority:.0f} / 100','Derived from the lower RUL bound',COLORS[latest.risk])])
    st.subheader('Sensor evidence')
    st.caption('Measured trends, not proof of physical causality.')
    selected=st.multiselect('Diagnostic sensors',bundle['sensors'],default=bundle['sensors'][:2],max_selections=4)
    cols=st.columns(2)
    for i,sensor in enumerate(selected):
        with cols[i%2],st.container(border=True):
            recent=clean[sensor].tail(10).mean();delta=(clean[sensor].iloc[-1]-clean[sensor].iloc[-6])/5 if len(clean)>=6 else 0
            st.markdown(f'**{sensor.upper()}** · Current {clean[sensor].iloc[-1]:.3f} · Recent average {recent:.3f} · Δ5/5 {delta:+.3f}')
            fig=go.Figure();fig.add_scatter(x=clean.cycle,y=clean[sensor],name='Raw');fig.add_scatter(x=clean.cycle,y=clean[sensor].rolling(10,min_periods=1).mean(),name='Trailing mean');chart(fig,220)
    st.download_button('Download diagnostic results',result.drop(columns='unit').to_csv(index=False).encode(),'aeropredict-diagnostic-results.csv','text/csv')
