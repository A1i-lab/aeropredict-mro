# AeroPredict MRO

Ce dossier contient l'application, les données NASA FD001, le modèle entraîné, les notebooks exécutés, les tests et le rapport académique.

## Lancer l'application
Installe Python 3.12, ouvre un terminal dans ce dossier, puis exécute :

```bash
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

Aucun réentraînement n'est nécessaire pour découvrir les sept pages.

## Résultats
La forêt aléatoire retenue obtient une MAE de 14,13 cycles, un RMSE de 18,86 cycles et un R² de 0,794 sur les 100 moteurs officiels de test, sans plafonner la vérité de test. Les intervalles sont larges : leur couverture de 97 % ne constitue pas une garantie de sécurité.

## Présentation en entretien
« AeroPredict MRO est un projet de maintenance prédictive développé avec les données publiques de simulation de la NASA. L'application analyse l'historique des capteurs de 100 moteurs pour estimer leur durée de vie restante et aider à prioriser les inspections. J'ai construit toute la chaîne, depuis la préparation des données jusqu'aux modèles et à l'interface Streamlit. J'ai surtout veillé à séparer les moteurs d'entraînement et d'évaluation pour éviter les fuites de données. Le tableau de bord présente les risques, les incertitudes et les recommandations de manière lisible. C'est un démonstrateur académique indépendant, pas un outil autorisé à prendre des décisions sur de vrais avions. »

## Publication
Le dépôt GitHub distant (github.com/A1i-lab/aeropredict-mro) et l'application Streamlit Cloud (aeropredict-mro.streamlit.app) sont publiés. Le détail est documenté dans docs/deployment.md. Le statut exact des vérifications se trouve dans docs/validation.md, y compris les points restant à vérifier manuellement (défilement et export CSV sur le déploiement cloud).
