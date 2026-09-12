"""Reproducible illustrative signals, never OEM limits or aircraft operational data."""
import csv
import json
import math
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SYSTEMS = [
    dict(id='apu', name='Groupe auxiliaire de puissance', short='APU', metric='Temps de démarrage', unit='s', baseline=25, limit=55, location='Dans la queue', purpose='Fournir de l’électricité et de l’air au sol.', observation='Un démarrage progressivement plus long peut justifier une analyse des conditions de fonctionnement.', review='Comparer les démarrages dans des conditions similaires avant de demander une revue technique.'),
    dict(id='brakes', name='Freins du train principal', short='Freins', metric='Perte d’épaisseur simulée', unit='mm', baseline=0, limit=12, location='Au niveau des roues principales', purpose='Ralentir l’avion après l’atterrissage.', observation='L’usure cumulée augmente avec les sollicitations et les cycles.', review='Examiner l’historique d’utilisation et prévoir une mesure de l’usure.'),
    dict(id='hydraulic', name='Circuit hydraulique', short='Hydraulique', metric='Temps de récupération de pression', unit='s', baseline=1, limit=5, location='Dans la partie centrale du fuselage', purpose='Transmettre la puissance à plusieurs équipements mobiles.', observation='Un retour à la pression plus lent est un signal à examiner dans ce scénario.', review='Vérifier les conditions de mesure et demander l’analyse de la tendance de pression.'),
    dict(id='pack', name='Conditionnement d’air', short='Air cabine', metric='Écart à la température cible', unit='°C', baseline=0, limit=10, location='Sous le fuselage, près des ailes', purpose='Contribuer au confort thermique de la cabine.', observation='Un écart croissant à la consigne indique une dégradation simulée de la régulation.', review='Comparer les écarts en tenant compte de la température extérieure et de la charge.'),
    dict(id='actuator', name='Actionneur de volet', short='Actionneur', metric='Temps de réponse', unit='ms', baseline=180, limit=450, location='Dans l’aile', purpose='Déplacer un volet selon la commande reçue.', observation='Un allongement progressif du temps de réponse peut déclencher une revue de tendance.', review='Faire examiner les temps de réponse et les conditions de sollicitation par un spécialiste.'),
]

def build():
    records, rows = [], []
    for aircraft in range(1, 13):
        for j, system in enumerate(SYSTEMS):
            phase = (aircraft * 7 + j * 13) % 31
            slope = .45 + ((aircraft * 3 + j * 7) % 13) * .065
            end = 28 + ((aircraft * 17 + j * 23) % 72)
            history = []
            for cycle in range(1, 61):
                degradation = max(0, end - slope * (60-cycle) + math.sin(cycle*.71+phase)*.9)
                value = system['baseline'] + degradation / 100 * (system['limit']-system['baseline'])
                point = dict(cycle=cycle, value=round(value, 3))
                history.append(point)
                rows.append(dict(aircraft=f'DEMO-{aircraft:03}', system=system['id'], **point, source='synthetic-v1'))
            records.append(dict(id=f'DEMO-{aircraft:03}-{system["id"]}', aircraft=f'DEMO-{aircraft:03}', system=system['id'], history=history))
    return dict(version='synthetic-v1', source='Scénarios synthétiques créés pour AeroPredict. Aucun relevé constructeur ou compagnie.', method='Régression linéaire sur les 20 dernières observations. Projection jusqu’à un seuil illustratif, sans validation sur des pannes réelles.', systems=SYSTEMS, records=records), rows

if __name__ == '__main__':
    data, rows = build()
    (ROOT/'frontend/src/aircraft-data.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
    with (ROOT/'data/synthetic/equipment_signals.csv').open('w') as f:
        w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
    print(f'{len(data["records"])} equipment scenarios, {len(rows)} observations')
