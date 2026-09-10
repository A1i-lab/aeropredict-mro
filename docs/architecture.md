# Architecture

Offline acquisition validates and fingerprints the NASA archive. Feature engineering and model training share the same functions as inference. Inference produces per-cycle histories and a last-observed-cycle fleet snapshot. The runtime caches prepared data and renders seven views; it never trains models.

```mermaid
flowchart TD
 A["NASA FD001"] --> B["Quality and causal features"]
 B --> C["RUL regressor"]
 B --> D["30-cycle classifier"]
 C --> E["Calibrated RUL interval"]
 E --> F["Review rules and priority"]
 D --> G["Prepared fleet histories"]
 F --> G
 G --> H["Streamlit workspace"]
```

src/config.py centralizes thresholds. data_loader.py validates input. features.py contains causal transforms. inference.py reuses these transforms. business_rules.py isolates academic decisions. views.py contains page composition and ui.py centralizes visual tokens and components. artifacts/metrics stores actual results, not manually entered claims.
