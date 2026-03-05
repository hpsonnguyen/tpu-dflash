#!/usr/bin/env python3
"""Import benchmark data from the tpu-spec-decode GitHub repo into the website's data/ directory.

Fetches results from:
  - Standalone data:       results/v5p/  (TPU v5p hardware)
  - vLLM pipeline + Eagle3: results/v4/  (only available on v4)

Transforms them into the schemas expected by the website's D3 charts and replay component.

Usage:
  python scripts/import_data.py            # fetch from GitHub and write to data/
  python scripts/import_data.py --dry-run  # print what would be written without saving
"""

import csv
import io
import json
import os
import sys
import urllib.request

REPO_RAW = "https://raw.githubusercontent.com/aaronzhfeng/tpu-spec-decode/main"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "data")

MATH_DATASETS = ["gsm8k", "math500", "aime24", "aime25"]
ALL_V5P_DATASETS = [
    "gsm8k", "math500", "aime24", "aime25",
    "humaneval", "mbpp", "mt-bench", "alpaca", "swe-bench",
]

# GPU paper reference (DFlash paper Table 1, Qwen3-4B, temp=0).
# gpu_baseline_tps is estimated from the paper's reported TPOT.
GPU_PAPER = {
    "gsm8k":  {"tau": 6.53, "speedup": 5.15, "baseline_tps": 73.8},
    "math500": {"tau": 7.84, "speedup": 6.09, "baseline_tps": 73.8},
    "aime24": {"tau": 7.27, "speedup": 5.68, "baseline_tps": 73.8},
    "aime25": {"tau": 6.64, "speedup": 5.21, "baseline_tps": 73.8},
}

# ---------------------------------------------------------------------------
# Fetch helpers
# ---------------------------------------------------------------------------

def fetch_text(path):
    url = f"{REPO_RAW}/{path}"
    print(f"  Fetching {url}")
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            return resp.read().decode("utf-8").strip()
    except Exception as e:
        print(f"  [WARN] Failed to fetch {url}: {e}")
        return None


def parse_csv(text):
    reader = csv.DictReader(io.StringIO(text))
    return [row for row in reader]


def fetch_csv(path):
    text = fetch_text(path)
    return parse_csv(text) if text else None


def fetch_json(path):
    text = fetch_text(path)
    return json.loads(text) if text else None


# ---------------------------------------------------------------------------
# Chart 1: vllm_pipeline_tps_comparison.csv
# Source: v4 (vLLM pipeline results only exist on v4)
# ---------------------------------------------------------------------------

def build_vllm_pipeline_tps():
    """Merge DFlash vLLM pipeline + Eagle3 pipeline into a single CSV.

    Source files (v4 only -- no vLLM pipeline data on v5p):
      results/v4/vllm_pipeline_results.csv  (baseline + dflash)
      results/v4/eagle3_llama_results.csv   (baseline + eagle3)

    Note: Eagle3 uses Llama-3.1-8B (different baseline ~51 TPS).
    The website shows all three methods per dataset; baseline uses the
    DFlash run's baseline (~92 TPS) since that's the primary comparison.
    """
    vllm = fetch_csv("results/v4/vllm_pipeline_results.csv")
    eagle3 = fetch_csv("results/v4/eagle3_llama_results.csv")
    if not vllm:
        return None

    rows = []
    for r in vllm:
        method = r["method"].strip()
        ds = r["dataset"].strip()
        rows.append({
            "dataset": ds,
            "method": method,
            "tps": round(float(r["tps"])),
            "speedup": float(r["speedup"]) if r["speedup"].strip() else 1.0,
            "num_prompts": int(r["num_prompts"]),
        })

    if eagle3:
        for r in eagle3:
            method = r["method"].strip()
            if method != "eagle3":
                continue
            ds = r["dataset"].strip()
            rows.append({
                "dataset": ds,
                "method": "eagle3",
                "tps": round(float(r["tps"])),
                "speedup": round(float(r["speedup"]), 2) if r["speedup"].strip() else "",
                "num_prompts": int(r["num_prompts"]),
            })

    return rows


# ---------------------------------------------------------------------------
# Chart 2: standalone_tpu_vs_gpu_tps.csv
# Source: v5p standalone data
# ---------------------------------------------------------------------------

def build_standalone_tpu_vs_gpu():
    """Build TPU vs GPU standalone comparison from all v5p results.

    Source: results/v5p/standalone_all_benchmarks.csv (all 9 datasets)
    GPU DFlash TPS is derived from paper speedup * estimated GPU baseline TPS
    (only available for math datasets).
    """
    data = fetch_csv("results/v5p/standalone_all_benchmarks.csv")
    if not data:
        return None

    rows = []
    for r in data:
        ds = r["dataset"].strip()
        tpu_bl = round(float(r["tpu_baseline_tps"]), 1)
        tpu_df = round(float(r["tpu_dflash_tps"]), 1)
        tpu_spd = round(float(r["tpu_speedup"]), 2)

        gpu_ref = GPU_PAPER.get(ds, {})
        gpu_spd = gpu_ref.get("speedup", 0)
        gpu_bl = gpu_ref.get("baseline_tps", 73.8)
        gpu_df = round(gpu_spd * gpu_bl, 1) if gpu_spd else ""

        rows.append({
            "dataset": ds,
            "tpu_baseline_tps": tpu_bl,
            "tpu_dflash_tps": tpu_df,
            "gpu_dflash_tps": gpu_df,
            "tpu_speedup": tpu_spd,
            "gpu_speedup": round(gpu_spd, 2) if gpu_spd else "",
        })

    if rows:
        n = len(rows)
        gpu_rows = [r for r in rows if r["gpu_dflash_tps"] != ""]
        rows.append({
            "dataset": "AVERAGE",
            "tpu_baseline_tps": round(sum(r["tpu_baseline_tps"] for r in rows) / n, 1),
            "tpu_dflash_tps": round(sum(r["tpu_dflash_tps"] for r in rows) / n, 1),
            "gpu_dflash_tps": round(sum(r["gpu_dflash_tps"] for r in gpu_rows) / len(gpu_rows), 1) if gpu_rows else "",
            "tpu_speedup": round(sum(r["tpu_speedup"] for r in rows) / n, 2),
            "gpu_speedup": round(sum(r["gpu_speedup"] for r in gpu_rows) / len(gpu_rows), 2) if gpu_rows else "",
        })

    return rows


# ---------------------------------------------------------------------------
# Chart 3: acceptance_analysis.csv
# Source: v5p standalone + v4 vLLM pipeline
# ---------------------------------------------------------------------------

def build_acceptance_analysis():
    """Build acceptance volume chart data (tau x drafts/sec = accepted TPS).

    Sources:
      - TPU standalone: results/v5p/standalone_vs_gpu_paper.csv AVERAGE row
      - GPU standalone:  GPU_PAPER reference
      - TPU vLLM DFlash: results/v4/vllm_pipeline_acceptance.csv + vllm_pipeline_results.csv (v4 only)
      - TPU vLLM Eagle3: results/v4/eagle3_llama_results.csv (v4 only)
    """
    standalone = fetch_csv("results/v5p/standalone_all_benchmarks.csv")
    vllm_acc = fetch_csv("results/v4/vllm_pipeline_acceptance.csv")
    vllm_res = fetch_csv("results/v4/vllm_pipeline_results.csv")
    eagle3_res = fetch_csv("results/v4/eagle3_llama_results.csv")

    rows = []

    # GPU standalone (from paper averages -- math datasets only)
    avg_gpu = GPU_PAPER
    gpu_tau = sum(v["tau"] for v in avg_gpu.values()) / len(avg_gpu)
    gpu_spd = sum(v["speedup"] for v in avg_gpu.values()) / len(avg_gpu)
    gpu_bl = list(avg_gpu.values())[0]["baseline_tps"]
    gpu_tps = round(gpu_spd * gpu_bl, 1)
    gpu_dps = round(gpu_tps / gpu_tau, 1)
    rows.append({
        "method": "gpu_dflash_standalone",
        "tau": round(gpu_tau, 1),
        "drafts_per_second": gpu_dps,
        "accepted_tps": gpu_tps,
        "dataset": "AVERAGE",
    })

    # TPU standalone (v5p -- average across all datasets)
    if standalone:
        taus = [float(r["tpu_tau"]) for r in standalone]
        tps_list = [float(r["tpu_dflash_tps"]) for r in standalone]
        if taus and tps_list:
            tpu_tau = round(sum(taus) / len(taus), 1)
            tpu_tps = round(sum(tps_list) / len(tps_list), 1)
            tpu_dps = round(tpu_tps / tpu_tau, 1)
            rows.append({
                "method": "tpu_dflash_standalone",
                "tau": tpu_tau,
                "drafts_per_second": tpu_dps,
                "accepted_tps": tpu_tps,
                "dataset": "AVERAGE",
            })

    # TPU vLLM DFlash (v4)
    if vllm_acc and vllm_res:
        acc_map = {r["metric"].strip(): r["value"].strip() for r in vllm_acc}
        vllm_tau = round(float(acc_map.get("tau", 0)), 1)
        overall_dflash = [r for r in vllm_res
                          if r["dataset"].strip() == "OVERALL"
                          and r["method"].strip() == "dflash"]
        if overall_dflash:
            vllm_tps = round(float(overall_dflash[0]["tps"]), 1)
            vllm_dps = round(vllm_tps / vllm_tau, 1) if vllm_tau else 0
            rows.append({
                "method": "tpu_dflash_vllm",
                "tau": vllm_tau,
                "drafts_per_second": vllm_dps,
                "accepted_tps": vllm_tps,
                "dataset": "OVERALL",
            })

    # TPU vLLM Eagle3 (v4)
    if eagle3_res:
        overall_e3 = [r for r in eagle3_res
                      if r["dataset"].strip() == "OVERALL"
                      and r["method"].strip() == "eagle3"]
        if overall_e3:
            e3_tps = round(float(overall_e3[0]["tps"]), 1)
            e3_spd = float(overall_e3[0]["speedup"])
            e3_tau = round(e3_spd * 1.45, 1)
            e3_dps = round(e3_tps / e3_tau, 1) if e3_tau else 0
            rows.append({
                "method": "tpu_eagle3_vllm",
                "tau": e3_tau,
                "drafts_per_second": e3_dps,
                "accepted_tps": e3_tps,
                "dataset": "OVERALL",
            })

    return rows


# ---------------------------------------------------------------------------
# Chart 4: acceptance_rate_gpu_vs_tpu_standalone.csv
# Source: v5p standalone JSONs (acceptance_rate_per_pos from summary)
# ---------------------------------------------------------------------------

def build_acceptance_rate_gpu_vs_tpu():
    """Build per-position acceptance rate CSV from all v5p standalone JSONs.

    Source: results/v5p/standalone_*.json -> summary.acceptance_rate_per_pos
    GPU data is not available in the repo, so GPU rows are omitted.
    """
    pos_cols = [f"pos_{i}" for i in range(16)]
    rows = []

    for ds in ALL_V5P_DATASETS:
        data = fetch_json(f"results/v5p/standalone_{ds}.json")
        if not data:
            continue
        rates = data["summary"].get("acceptance_rate_per_pos", [])
        if not rates:
            continue
        row = {"dataset": ds, "variant": "tpu"}
        for i in range(16):
            row[f"pos_{i}"] = round(rates[i], 4) if i < len(rates) else ""
        rows.append(row)

    return rows


# ---------------------------------------------------------------------------
# Replay data: inference_replays.json
# Source: v5p standalone JSONs
# ---------------------------------------------------------------------------

def build_replay_data():
    """Build inference replay samples from all v5p standalone JSON per-sample data.

    Source: results/v5p/standalone_*.json (per_sample arrays)

    Note: The standalone JSONs contain TPS and acceptance_lengths per sample,
    but do NOT contain the decoded output text. Output text placeholders are
    left as-is. To add real output text, you need to record it during the
    benchmark run (see benchmark_suggestions.md section 3).
    """
    samples = []
    for ds in ALL_V5P_DATASETS:
        data = fetch_json(f"results/v5p/standalone_{ds}.json")
        if not data:
            continue

        non_warmup = [s for s in data["per_sample"] if not s.get("is_warmup")]
        if not non_warmup:
            continue

        sample = non_warmup[0]
        samples.append({
            "dataset": ds,
            "sample_idx": sample["sample_index"],
            "prompt": f"[{ds} sample {sample['sample_index']}]",
            "methods": {
                "baseline": {
                    "output_text": f"[Baseline output - {sample['baseline_num_output_tokens']} tokens]",
                    "tokens_per_second": round(sample["baseline_tps"], 1),
                    "output_token_count": sample["baseline_num_output_tokens"],
                },
                "dflash_tpu": {
                    "output_text": f"[DFlash TPU output - {sample['dflash_num_output_tokens']} tokens]",
                    "tokens_per_second": round(sample["dflash_tps"], 1),
                    "output_token_count": sample["dflash_num_output_tokens"],
                    "acceptance_lengths": sample["acceptance_lengths"],
                },
            },
        })

    return {"samples": samples} if samples else None


# ---------------------------------------------------------------------------
# Writers
# ---------------------------------------------------------------------------

def write_csv_file(path, fieldnames, rows, dry_run=False):
    if dry_run:
        print(f"\n[DRY RUN] Would write {path} ({len(rows)} rows)")
        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
        print(buf.getvalue()[:600])
        return

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"  Wrote {path} ({len(rows)} rows)")


def write_json_file(path, data, dry_run=False):
    if dry_run:
        print(f"\n[DRY RUN] Would write {path}")
        print(json.dumps(data, indent=2)[:500])
        return

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  Wrote {path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    dry_run = "--dry-run" in sys.argv

    print("=" * 60)
    print("Importing data from tpu-spec-decode -> website data/")
    print("  Standalone: results/v5p/  (TPU v5p)")
    print("  Pipeline:   results/v4/   (vLLM + Eagle3, v4 only)")
    print("=" * 60)

    # Chart 1 (v4 -- vLLM pipeline only exists on v4)
    print("\n[Chart 1] vLLM Pipeline TPS Comparison (v4)")
    vllm_data = build_vllm_pipeline_tps()
    if vllm_data:
        write_csv_file(
            os.path.join(DATA_DIR, "vllm_pipeline_tps_comparison.csv"),
            ["dataset", "method", "tps", "speedup", "num_prompts"],
            vllm_data, dry_run,
        )

    # Chart 2 (v5p standalone)
    print("\n[Chart 2] Standalone TPU vs GPU DFlash (v5p)")
    standalone_data = build_standalone_tpu_vs_gpu()
    if standalone_data:
        write_csv_file(
            os.path.join(DATA_DIR, "standalone_tpu_vs_gpu_tps.csv"),
            ["dataset", "tpu_baseline_tps", "tpu_dflash_tps", "gpu_dflash_tps",
             "tpu_speedup", "gpu_speedup"],
            standalone_data, dry_run,
        )

    # Chart 3 (v5p standalone + v4 pipeline)
    print("\n[Chart 3] Acceptance Analysis (v5p standalone + v4 pipeline)")
    acceptance_data = build_acceptance_analysis()
    if acceptance_data:
        write_csv_file(
            os.path.join(DATA_DIR, "acceptance_analysis.csv"),
            ["method", "tau", "drafts_per_second", "accepted_tps", "dataset"],
            acceptance_data, dry_run,
        )

    # Chart 4 (v5p standalone JSONs)
    print("\n[Chart 4] Acceptance Rate per Position (v5p)")
    pos_data = build_acceptance_rate_gpu_vs_tpu()
    if pos_data:
        pos_cols = [f"pos_{i}" for i in range(16)]
        write_csv_file(
            os.path.join(DATA_DIR, "acceptance_rate_gpu_vs_tpu_standalone.csv"),
            ["dataset", "variant"] + pos_cols,
            pos_data, dry_run,
        )
        print("  NOTE: Only TPU rows written. GPU standalone acceptance data is")
        print("        not available in the repo. Add GPU rows manually if needed.")

    # Replay data (v5p standalone JSONs)
    print("\n[Replay] Inference Replay Samples (v5p)")
    replay_data = build_replay_data()
    if replay_data:
        write_json_file(
            os.path.join(DATA_DIR, "inference_replays.json"),
            replay_data, dry_run,
        )
        print("  NOTE: Output text is placeholder. The standalone JSONs don't")
        print("        include decoded text. To get real output text, record it")
        print("        during benchmark runs (see benchmark_suggestions.md).")

    # Raw v5p CSVs (copied as-is for reference)
    print("\n[Raw] V5p reference CSVs")
    for csv_name in ["standalone_all_benchmarks.csv", "standalone_vs_v4.csv",
                      "standalone_vs_gpu_paper.csv"]:
        text = fetch_text(f"results/v5p/{csv_name}")
        if text:
            dest = os.path.join(DATA_DIR, f"v5p_{csv_name}")
            if dry_run:
                print(f"\n[DRY RUN] Would write {dest}")
            else:
                os.makedirs(DATA_DIR, exist_ok=True)
                with open(dest, "w", newline="") as f:
                    f.write(text + "\n")
                print(f"  Wrote {dest}")

    # Summary
    print("\n" + "=" * 60)
    print("Done. Data files updated in data/")
    print()
    print("Data sources used:")
    print("  Chart 1 (vLLM Pipeline TPS):      v4  (pipeline not available on v5p)")
    print("  Chart 2 (Standalone TPU vs GPU):   v5p")
    print("  Chart 3 (Acceptance Analysis):     v5p standalone + v4 pipeline")
    print("  Chart 4 (Acceptance per Position): v5p")
    print("  Replay (Inference Demo):           v5p")
    print()
    print("What still needs manual input:")
    print("  - Chart 2: GPU DFlash TPS is estimated from paper; replace if real GPU data available")
    print("  - Chart 4: GPU acceptance data not in repo; add manually or from paper")
    print("  - Replay:  Real output text needs to be recorded during benchmarks")
    print("  - Hero:    Update index.html hero metrics to match v5p numbers")


if __name__ == "__main__":
    main()
