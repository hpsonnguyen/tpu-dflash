# DFlash on TPU

Project website for the DFlash speculative decoding port to TPU (UCSD Data Science Capstone Winter 2026).

**Live site:** [https://hpsonnguyen.github.io/tpu-dflash/](https://hpsonnguyen.github.io/tpu-dflash/)

## For team members

See [benchmark_suggestions.md](benchmark_suggestions.md) for benchmarking notes to produce data for the suggested visualizations in the website.

## Repo structure

```
tpu-dflash/
├── index.html          # Main page
├── styles.css          # Layout and component styles
├── js/
│   ├── app.js          # Orchestrator: load data, render charts, wire replay
│   ├── charts.js       # D3 chart renderers (TPS, acceptance, position)
│   ├── dataLoader.js   # Fetch and parse CSV/JSON
│   ├── replay.js       # Inference replay cards (dataset selector, Play)
│   └── scrollTrigger.js
├── data/               # CSV benchmarks and replay samples
│   ├── vllm_pipeline_tps_comparison.csv
│   ├── standalone_tpu_vs_gpu_tps.csv
│   ├── acceptance_analysis.csv
│   ├── acceptance_rate_gpu_vs_tpu_standalone.csv
│   └── inference_replays.json
├── assets/
│   └── methods_diagram.svg
└── benchmark_suggestions.md
```

## Links

- [tpu-spec-decode](https://github.com/aaronzhfeng/tpu-spec-decode)
- [tpu-inference](https://github.com/aaronzhfeng/tpu-inference)
