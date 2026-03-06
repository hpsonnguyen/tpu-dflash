"""Generate 300-DPI publication-quality figures for the capstone poster.

Reads CSV/JSON data from ../data/ and writes PDF figures to figures/.
Run from the repo root:  python poster/generate_figures.py
"""

import csv
import json
import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data")
FIG_DIR = os.path.join(SCRIPT_DIR, "figures")
os.makedirs(FIG_DIR, exist_ok=True)

NAVY = "#1e3a5f"
INDIGO = "#6366f1"
TEAL = "#0ea5e9"
EMERALD = "#10b981"
AMBER = "#f59e0b"
ROSE = "#f43f5e"
SLATE = "#334155"

CATEGORY_COLORS = {"math": INDIGO, "code": TEAL, "chat": AMBER}
CATEGORY_ORDER = ["math", "code", "chat"]

DPI = 300
FONT_SIZE = 11

plt.rcParams.update({
    "font.family": "sans-serif",
    "font.size": FONT_SIZE,
    "axes.titlesize": 14,
    "axes.titleweight": "bold",
    "axes.labelsize": 12,
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
    "legend.fontsize": 10,
    "figure.dpi": DPI,
    "savefig.dpi": DPI,
    "savefig.bbox": "tight",
    "savefig.pad_inches": 0.15,
})


def read_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def read_json(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ── Figure 1: Summary Dashboard ──────────────────────────────────────────────

def fig_summary_dashboard():
    rows = read_csv("v5p_standalone_all_benchmarks.csv")
    datasets = [r["dataset"] for r in rows]
    speedups = [float(r["tpu_speedup"]) for r in rows]
    taus = [float(r["tpu_tau"]) for r in rows]
    categories = [r["category"] for r in rows]
    colors = [CATEGORY_COLORS[c] for c in categories]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))

    # Speedup bars
    x = np.arange(len(datasets))
    bars1 = ax1.bar(x, speedups, color=colors, edgecolor="white", linewidth=0.5)
    avg_speedup = np.mean(speedups)
    ax1.axhline(avg_speedup, color=ROSE, linewidth=1.5, linestyle="--", zorder=5)
    ax1.text(len(datasets) - 0.5, avg_speedup + 0.08, f"avg {avg_speedup:.2f}×",
             color=ROSE, fontsize=9, fontweight="bold", ha="right")
    for i, v in enumerate(speedups):
        ax1.text(i, v + 0.05, f"{v:.2f}×", ha="center", va="bottom", fontsize=8, fontweight="bold")
    ax1.set_xticks(x)
    ax1.set_xticklabels(datasets, rotation=40, ha="right", fontsize=8)
    ax1.set_ylabel("Speedup over Baseline")
    ax1.set_title("DFlash Speedup (TPU V5P)")
    ax1.set_ylim(0, max(speedups) * 1.25)
    ax1.spines["top"].set_visible(False)
    ax1.spines["right"].set_visible(False)

    # Tau bars
    bars2 = ax2.bar(x, taus, color=colors, edgecolor="white", linewidth=0.5)
    avg_tau = np.mean(taus)
    ax2.axhline(avg_tau, color=ROSE, linewidth=1.5, linestyle="--", zorder=5)
    ax2.text(len(datasets) - 0.5, avg_tau + 0.15, f"avg τ={avg_tau:.2f}",
             color=ROSE, fontsize=9, fontweight="bold", ha="right")
    for i, v in enumerate(taus):
        ax2.text(i, v + 0.1, f"{v:.2f}", ha="center", va="bottom", fontsize=8, fontweight="bold")
    ax2.set_xticks(x)
    ax2.set_xticklabels(datasets, rotation=40, ha="right", fontsize=8)
    ax2.set_ylabel("τ (accepted tokens / draft)")
    ax2.set_title("Draft Acceptance Length τ")
    ax2.set_ylim(0, max(taus) * 1.25)
    ax2.spines["top"].set_visible(False)
    ax2.spines["right"].set_visible(False)

    # Legend
    from matplotlib.patches import Patch
    legend_patches = [Patch(facecolor=CATEGORY_COLORS[c], label=c.capitalize()) for c in CATEGORY_ORDER]
    fig.legend(handles=legend_patches, loc="upper center", ncol=3, frameon=False,
               bbox_to_anchor=(0.5, 1.02))

    plt.tight_layout(rect=[0, 0, 1, 0.95])
    fig.savefig(os.path.join(FIG_DIR, "summary_dashboard.pdf"))
    plt.close(fig)
    print("  -> summary_dashboard.pdf")


# ── Figure 2: TPU vs GPU Parity ──────────────────────────────────────────────

def fig_tpu_vs_gpu_parity():
    rows = [r for r in read_csv("v5p_standalone_vs_gpu_paper.csv") if r["dataset"] != "AVERAGE"]
    datasets = [r["dataset"] for r in rows]
    v5p_tau = [float(r["v5p_tau"]) for r in rows]
    gpu_tau = [float(r["gpu_paper_tau"]) for r in rows]
    pct = [float(r["tau_pct_of_gpu"]) for r in rows]

    fig, ax = plt.subplots(figsize=(6, 4))
    x = np.arange(len(datasets))
    w = 0.35

    bars_gpu = ax.bar(x - w / 2, gpu_tau, w, label="GPU A100 (paper)", color="#94a3b8", edgecolor="white")
    bars_tpu = ax.bar(x + w / 2, v5p_tau, w, label="TPU V5P (ours)", color=INDIGO, edgecolor="white")

    for i in range(len(datasets)):
        label = f"{pct[i]:.0f}%"
        color = EMERALD if pct[i] >= 100 else SLATE
        ax.text(x[i] + w / 2, v5p_tau[i] + 0.15, label, ha="center", va="bottom",
                fontsize=9, fontweight="bold", color=color)

    ax.set_xticks(x)
    ax.set_xticklabels(datasets, fontsize=10)
    ax.set_ylabel("τ (accepted tokens / draft)")
    ax.set_title("Draft Quality Parity: TPU V5P vs GPU A100")
    ax.set_ylim(0, max(max(gpu_tau), max(v5p_tau)) * 1.25)
    ax.legend(frameon=False)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    avg_row = [r for r in read_csv("v5p_standalone_vs_gpu_paper.csv") if r["dataset"] == "AVERAGE"][0]
    ax.text(0.98, 0.02, f"Overall: {float(avg_row['tau_pct_of_gpu']):.1f}% of GPU τ",
            transform=ax.transAxes, ha="right", va="bottom", fontsize=10,
            fontweight="bold", color=NAVY,
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#eef2ff", edgecolor=INDIGO, alpha=0.9))

    plt.tight_layout()
    fig.savefig(os.path.join(FIG_DIR, "tpu_vs_gpu_parity.pdf"))
    plt.close(fig)
    print("  -> tpu_vs_gpu_parity.pdf")


# ── Figure 3: Acceptance Rate by Position ────────────────────────────────────

def fig_acceptance_decay():
    rows = read_csv("acceptance_rate_gpu_vs_tpu_standalone.csv")
    positions = list(range(1, 17))

    cmap = matplotlib.colormaps.get_cmap("tab10")
    fig, ax = plt.subplots(figsize=(7, 4))

    for i, row in enumerate(rows):
        dataset = row["dataset"]
        rates = [float(row[f"pos_{p}"]) for p in range(16)]
        cat = None
        for r2 in read_csv("v5p_standalone_all_benchmarks.csv"):
            if r2["dataset"] == dataset:
                cat = r2["category"]
                break
        color = CATEGORY_COLORS.get(cat, cmap(i))
        ax.plot(positions, rates, marker="o", markersize=4, linewidth=2, label=dataset, color=color)

    ax.set_xlabel("Draft Position (1–16)")
    ax.set_ylabel("Acceptance Probability")
    ax.set_title("Acceptance Rate Decay by Draft Position")
    ax.set_xticks(positions)
    ax.set_ylim(0, 1.05)
    ax.legend(fontsize=8, ncol=3, loc="upper right", frameon=False)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", alpha=0.3)

    plt.tight_layout()
    fig.savefig(os.path.join(FIG_DIR, "acceptance_decay.pdf"))
    plt.close(fig)
    print("  -> acceptance_decay.pdf")


# ── Figure 4: Cost Efficiency ────────────────────────────────────────────────

def fig_cost_efficiency():
    PRICE_V5P = 2.10
    PRICE_V4 = 3.22
    PRICE_GPU = 5.07

    v5p = read_csv("v5p_standalone_all_benchmarks.csv")
    v4 = read_csv("v4_standalone_all_benchmarks.csv")
    gpu_rows = [r for r in read_csv("v5p_standalone_vs_gpu_paper.csv") if r["dataset"] != "AVERAGE"]

    gpu_tps_map = {}
    for r in gpu_rows:
        speedup = float(r["gpu_paper_speedup"])
        baseline = float(r["v5p_baseline_tps"])
        gpu_tps_map[r["dataset"]] = baseline * speedup * (PRICE_V5P / PRICE_GPU)

    def cost_per_mtok(tps, price_hr):
        if tps <= 0:
            return 0
        return (price_hr / tps) * (1_000_000 / 3600)

    datasets_all = [r["dataset"] for r in v5p]
    v4_map = {r["dataset"]: float(r["tpu_dflash_tps"]) for r in v4}

    costs_v5p = []
    costs_v4 = []
    costs_gpu = []
    labels = []

    for r in v5p:
        ds = r["dataset"]
        labels.append(ds)
        costs_v5p.append(cost_per_mtok(float(r["tpu_dflash_tps"]), PRICE_V5P))
        costs_v4.append(cost_per_mtok(v4_map.get(ds, 0), PRICE_V4))
        if ds in gpu_tps_map:
            costs_gpu.append(cost_per_mtok(gpu_tps_map[ds], PRICE_GPU))
        else:
            costs_gpu.append(0)

    fig, ax = plt.subplots(figsize=(9, 4.5))
    x = np.arange(len(labels))
    w = 0.25

    ax.bar(x - w, costs_v5p, w, label=f"TPU V5P (${PRICE_V5P}/hr)", color=INDIGO, edgecolor="white")
    ax.bar(x, costs_v4, w, label=f"TPU V4 (${PRICE_V4}/hr)", color=TEAL, edgecolor="white")

    gpu_mask = [i for i, c in enumerate(costs_gpu) if c > 0]
    if gpu_mask:
        ax.bar(np.array(gpu_mask) + w,
               [costs_gpu[i] for i in gpu_mask], w,
               label=f"GPU A100 (${PRICE_GPU}/hr)", color="#94a3b8", edgecolor="white")

    avg_v5p = np.mean(costs_v5p)
    ax.axhline(avg_v5p, color=ROSE, linewidth=1.5, linestyle="--")
    ax.text(len(labels) - 0.3, avg_v5p + 0.05, f"V5P avg ${avg_v5p:.2f}",
            color=ROSE, fontsize=9, fontweight="bold", ha="right")

    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=40, ha="right", fontsize=9)
    ax.set_ylabel("Cost per Million Tokens ($)")
    ax.set_title("Cost Efficiency: DFlash Inference (GCP On-Demand Pricing)")
    ax.legend(fontsize=9, frameon=False, loc="upper right")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    plt.tight_layout()
    fig.savefig(os.path.join(FIG_DIR, "cost_efficiency.pdf"))
    plt.close(fig)
    print("  -> cost_efficiency.pdf")


# ── Figure 5: Step Profiling Pie ─────────────────────────────────────────────

def fig_profiling():
    data = read_json("profiling_gsm8k.json")
    summary = data["summary"]

    components = [
        ("Verification", summary["verify_forward"]["total_ms"]),
        ("Acceptance", summary["acceptance"]["total_ms"]),
        ("Draft Sampling", summary["draft_sample"]["total_ms"]),
        ("Host↔Device", summary["host_device_xfer"]["total_ms"]),
        ("Aux Projection", summary["aux_projection"]["total_ms"]),
        ("Draft Forward", summary["draft_forward"]["total_ms"]),
        ("Context Update", summary["ctx_update"]["total_ms"]),
        ("Cache Mgmt", summary["cache_mgmt"]["total_ms"]),
    ]

    labels = [c[0] for c in components]
    sizes = [c[1] for c in components]
    total = sum(sizes)

    colors_pie = [INDIGO, AMBER, TEAL, "#94a3b8", ROSE, EMERALD, "#a78bfa", "#cbd5e1"]

    fig, ax = plt.subplots(figsize=(5, 4.5))
    wedges, texts, autotexts = ax.pie(
        sizes, labels=None, autopct=lambda p: f"{p:.1f}%" if p > 3 else "",
        colors=colors_pie, startangle=90, pctdistance=0.75,
        wedgeprops=dict(edgecolor="white", linewidth=1.5)
    )
    for t in autotexts:
        t.set_fontsize(8)
        t.set_fontweight("bold")

    ax.legend(wedges, [f"{l} ({s:.0f} ms)" for l, s in zip(labels, sizes)],
              loc="center left", bbox_to_anchor=(1, 0.5), fontsize=8, frameon=False)
    ax.set_title("Step Time Breakdown — GSM8K (TPU V4)", fontsize=12)

    plt.tight_layout()
    fig.savefig(os.path.join(FIG_DIR, "profiling.pdf"))
    plt.close(fig)
    print("  -> profiling.pdf")


# ── QR Code ──────────────────────────────────────────────────────────────────

def generate_qr():
    try:
        import qrcode
    except ImportError:
        print("  [SKIP] qrcode not installed (pip install qrcode[pil])")
        return

    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=20, border=2)
    qr.add_data("https://hpsonnguyen.github.io/tpu-dflash/")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    out = os.path.join(FIG_DIR, "qrcode.png")
    img.save(out)
    print(f"  -> qrcode.png")


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Generating poster figures (300 DPI)...")
    fig_summary_dashboard()
    fig_tpu_vs_gpu_parity()
    fig_acceptance_decay()
    fig_cost_efficiency()
    fig_profiling()
    generate_qr()
    print("Done.")
