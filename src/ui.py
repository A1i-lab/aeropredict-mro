import base64
import streamlit as st
import plotly.graph_objects as go
from .config import ROOT
COLORS={'HEALTHY':'#16826C','WATCH':'#B47916','CRITICAL':'#C6454D'}

def style():
    st.markdown('''<style>
    .stApp{background:#F4F6F9} .block-container{padding:2rem 2.8rem 3rem;max-width:1600px}
    h1,h2,h3{letter-spacing:-.035em;color:#142338} h1{font-weight:650!important} h3{font-size:1.16rem!important}
    p{line-height:1.55} [data-testid="stHeader"]{background:transparent}
    [data-testid="stSidebar"]{background:#0C1829;min-width:244px;max-width:244px;border-right:1px solid #243247}
    [data-testid="stSidebar"] *{color:#B7C6D8}
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] strong{color:#fff}
    [data-testid="stSidebar"] [data-testid="stRadio"] label{padding:10px 8px;border-radius:5px}
    [data-testid="stSidebar"] [data-testid="stRadio"] label:has(input:checked){background:#20334D;color:#fff}
    [data-testid="stSidebar"] [data-testid="stRadio"] label:hover{background:#172B43}
    [data-testid="stSidebarUserContent"]{padding-top:1.1rem}
    [data-testid="stVerticalBlockBorderWrapper"]>div{border-color:#DFE5EC!important;border-radius:9px!important;background:#fff}
    [data-testid="stMetric"]{padding:0!important}
    [data-testid="stDataFrame"]{border:1px solid #DFE5EC;border-radius:6px;overflow:hidden}
    .brand{font-size:24px;font-weight:700;letter-spacing:-1px;color:white!important;line-height:1.2;margin-bottom:8px}
    .brand b{color:#68A9FF!important}.brand-sub{font-size:10px;letter-spacing:2.5px;color:#8DA4BF;margin-bottom:42px}
    .eyebrow{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#668099;margin:0 0 10px}
    .topline{display:flex;justify-content:space-between;font-size:11px;letter-spacing:1.5px;color:#667B92;margin:0 0 22px}
    .hero{position:relative;overflow:hidden;border-radius:10px;padding:32px 36px;background-color:#0B1628;background-size:cover;background-position:center 48%;margin:0 0 22px;min-height:232px}
    .hero h1{color:#F5F8FF;font-size:38px;line-height:1.08;max-width:470px;margin:4px 0 12px;font-weight:600}
    .hero p{color:#B1C3DA;font-size:13px;max-width:375px}.hero .eyebrow{color:#82B8FA}
    .hero-tag{display:inline-block;font-size:10px;letter-spacing:1px;color:#C5D9F0;border:1px solid #415872;padding:5px 9px;border-radius:3px;margin-top:10px}
    .kpi{background:white;border:1px solid #DFE5EC;border-radius:8px;padding:19px 21px;min-height:123px;border-top:3px solid var(--accent)}
    .kpi-label{font-size:11px;color:#62758B;letter-spacing:.4px}.kpi-number{font-size:34px;letter-spacing:-1.6px;line-height:1.35;color:#15263E;font-weight:650}.kpi-foot{font-size:10px;color:#77889A}
    .notice{background:#EAF0F7;border-left:3px solid #2878E8;padding:13px 18px;margin:18px 0 24px;font-size:13px;color:#334F6D;border-radius:0 5px 5px 0}
    .chip{display:inline-block;background:var(--bg);color:var(--color);font-size:10px;font-weight:700;letter-spacing:1px;padding:5px 8px;border-radius:3px}
    .alert{display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:18px;background:#fff;border:1px solid #DFE5EC;border-left:3px solid var(--accent);padding:20px 24px;margin:0 0 10px;border-radius:5px}
    .alert strong{font-size:17px;color:#142338}.alert small{color:#6B7D90;font-size:11px}.alert p{font-size:12px;margin:7px 0 0;color:#4B6078}
    .big-rul{font-size:74px;letter-spacing:-4px;color:#142338;font-weight:650;line-height:1.1}.big-rul span{font-size:16px;letter-spacing:0;color:#6B7D90;font-weight:400}
    .footnote{margin-top:32px;padding-top:17px;border-top:1px solid #DFE5EC;font-size:10px;color:#75869A;letter-spacing:.25px}
    .pipeline{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}.step{padding:22px;background:white;border:1px solid #DFE5EC;border-radius:6px}.step b{display:block;margin:7px 0}.step small{color:#6B7D90}
    @media(max-width:800px){.block-container{padding:1.2rem}.hero{padding:24px;min-height:230px;background-position:60% center}.hero h1{font-size:30px;max-width:240px}.hero p{max-width:230px}.alert{grid-template-columns:1fr}.pipeline{grid-template-columns:1fr}.kpi{padding:14px}.kpi-number{font-size:28px}}
    </style>''',unsafe_allow_html=True)

def hero(title,subtitle,tag='FLEET INTELLIGENCE / FD001'):
    img=base64.b64encode((ROOT/'assets/aircraft.webp').read_bytes()).decode()
    st.markdown(f'''<div class="hero" style="background-image:linear-gradient(90deg,rgba(11,22,40,.95) 0%,rgba(11,22,40,.8) 32%,rgba(11,22,40,0) 75%),url(data:image/webp;base64,{img})"><div class="eyebrow">{tag}</div><h1>{title}</h1><p>{subtitle}</p><span class="hero-tag">NASA C-MAPSS &nbsp; / &nbsp; ACADEMIC DEMONSTRATOR</span></div>''',unsafe_allow_html=True)

def kpis(items):
    for col,(label,value,foot,color) in zip(st.columns(len(items)),items):
        col.markdown(f'<div class="kpi" style="--accent:{color}"><div class="kpi-label">{label}</div><div class="kpi-number">{value}</div><div class="kpi-foot">{foot}</div></div>',unsafe_allow_html=True)

def notice(text): st.markdown(f'<div class="notice">{text}</div>',unsafe_allow_html=True)
def chip(risk):
    c=COLORS[risk]; return f'<span class="chip" style="--bg:{c}16;--color:{c}">{risk}</span>'

def chart(fig,height=280):
    fig.update_layout(height=height,margin=dict(l=12,r=12,t=12,b=12),paper_bgcolor='rgba(0,0,0,0)',plot_bgcolor='rgba(0,0,0,0)',font=dict(family='Arial, sans-serif',size=11,color='#64768B'),colorway=['#2878E8','#7DADC9','#16826C'],legend=dict(orientation='h',y=1.15,x=0),hoverlabel=dict(bgcolor='#142338',font_color='white'))
    fig.update_xaxes(gridcolor='#EAF0F5',zeroline=False,title_font_size=11)
    fig.update_yaxes(gridcolor='#EAF0F5',zeroline=False,title_font_size=11)
    st.plotly_chart(fig,width='stretch',config={'displayModeBar':False})

def table(df,compact=False):
    cols=['engine','cycle','rul','lower','upper','failure_probability','health','risk','action']
    if 'priority' in df: cols.insert(1,'priority')
    labels={'engine':'Engine ID','priority':'Priority','cycle':'Cycle','rul':'RUL','lower':'Lower','upper':'Upper','failure_probability':'P(RUL ≤ 30)','health':'Health','risk':'Status','action':'Recommended action'}
    t=df[cols].rename(columns=labels)
    sty=t.style.map(lambda v:f'color: {COLORS[v]}; font-weight: 600',subset=['Status'])
    st.dataframe(sty,hide_index=True,width='stretch',height=min(440,36*len(t)+40),column_config={'Priority':st.column_config.ProgressColumn('Priority',min_value=0,max_value=100,format='%.0f'),'Health':st.column_config.NumberColumn(format='%.0f / 100'),'RUL':st.column_config.NumberColumn('RUL (cycles)',format='%.1f'),'Lower':st.column_config.NumberColumn(format='%.1f'),'Upper':st.column_config.NumberColumn(format='%.1f'),'P(RUL ≤ 30)':st.column_config.NumberColumn(format='percent')})
