# DFlash on TPU

Project website for the DFlash speculative decoding port to TPU (UCSD Data Science Capstone Winter 2026).

**Live site:** [https://hpsonnguyen.github.io/tpu-dflash/](https://hpsonnguyen.github.io/tpu-dflash/)

## Repo structure

```
tpu-dflash/
├── index.html              # Main page
├── styles.css              # Layout and component styles
├── js/
│   ├── app.js              # Orchestrator: load data, render charts, carousel, scroll replay
│   ├── charts.js           # D3 chart renderers (15 interactive charts)
│   ├── dataLoader.js       # Fetch and parse CSV/JSON data files
│   ├── replay.js           # Inference replay cards (dataset selector, Play)
│   └── scrollTrigger.js    # Scroll-triggered fade-in and chart animation replay
├── data/
│   ├── vllm_pipeline_tps_comparison.csv
│   ├── standalone_tpu_vs_gpu_tps.csv
│   ├── acceptance_analysis.csv
│   ├── acceptance_rate_gpu_vs_tpu_standalone.csv
│   ├── inference_replays.json
│   ├── profiling_gsm8k.json
│   ├── v4_standalone_all_benchmarks.csv
│   ├── v5p_standalone_all_benchmarks.csv
│   ├── v5p_standalone_vs_gpu_paper.csv
│   └── v5p_standalone_vs_v4.csv
├── assets/
│   └── methods_diagram.svg
└── scripts/
    ├── import_data.py      # Fetch data from tpu-spec-decode repo
    └── README.md           # Script documentation
```

## Local preview

```bash
python -m http.server 3000
# Open http://localhost:3000
```

## Updating data

```bash
python scripts/import_data.py          # fetch latest from tpu-spec-decode
python scripts/import_data.py --dry-run  # preview without writing
```

See [scripts/README.md](scripts/README.md) for details on data sources and manual inputs.

## Links

- [tpu-spec-decode](https://github.com/aaronzhfeng/tpu-spec-decode) — benchmark code and results
- [tpu-inference](https://github.com/aaronzhfeng/tpu-inference) — TPU inference runtime
