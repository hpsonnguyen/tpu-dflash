/** app.js - Orchestrator: load data, render charts, wire scroll-triggered replay */

function renderCharts(data) {
  const vllmEl = document.getElementById("vllm-pipeline-tps-chart");
  if (vllmEl && data.vllmPipelineTps && data.vllmPipelineTps.length > 0) {
    try { window.charts.renderVllmPipelineTps(vllmEl, data.vllmPipelineTps); } catch (e) { console.error("Chart 1:", e); vllmEl.innerHTML = "<p class=\"error\">Chart error.</p>"; }
  } else if (vllmEl && !vllmEl.querySelector(".error")) {
    vllmEl.innerHTML = "<p class=\"error\">Failed to load vllm_pipeline_tps_comparison.csv</p>";
  }

  const standaloneEl = document.getElementById("standalone-tpu-vs-gpu-chart");
  if (standaloneEl && data.standaloneTpuVsGpu && data.standaloneTpuVsGpu.length > 0) {
    try { window.charts.renderStandaloneTpuVsGpu(standaloneEl, data.standaloneTpuVsGpu); } catch (e) { console.error("Chart 2:", e); standaloneEl.innerHTML = "<p class=\"error\">Chart error.</p>"; }
  } else if (standaloneEl && !standaloneEl.querySelector(".error")) {
    standaloneEl.innerHTML = "<p class=\"error\">Failed to load standalone_tpu_vs_gpu_tps.csv</p>";
  }

  const acceptanceEl = document.getElementById("acceptance-analysis-chart");
  if (acceptanceEl && data.acceptanceAnalysis && data.acceptanceAnalysis.length > 0) {
    try { window.charts.renderAcceptanceAnalysis(acceptanceEl, data.acceptanceAnalysis); } catch (e) { console.error("Chart 3:", e); acceptanceEl.innerHTML = "<p class=\"error\">Chart error.</p>"; }
  } else if (acceptanceEl && !acceptanceEl.querySelector(".error")) {
    acceptanceEl.innerHTML = "<p class=\"error\">Failed to load acceptance_analysis.csv</p>";
  }

  const gpuVsTpuEl = document.getElementById("acceptance-gpu-vs-tpu-chart");
  if (gpuVsTpuEl && data.acceptanceGpuVsTpu && data.acceptanceGpuVsTpu.length > 0) {
    try { window.charts.renderAcceptanceGpuVsTpu(gpuVsTpuEl, data.acceptanceGpuVsTpu); } catch (e) { console.error("Chart 4:", e); gpuVsTpuEl.innerHTML = "<p class=\"error\">Chart error.</p>"; }
  } else if (gpuVsTpuEl && !gpuVsTpuEl.querySelector(".error")) {
    gpuVsTpuEl.innerHTML = "<p class=\"error\">Failed to load acceptance_rate_gpu_vs_tpu_standalone.csv</p>";
  }
}

async function init() {
  const data = await window.dataLoader.loadData();

  renderCharts(data);

  let resizeTimeout;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      renderCharts(data);
    }, 150);
  });

  // Chart "view more" toggles
  document.querySelectorAll(".chart-view-more").forEach(function (btn) {
    var targetId = btn.getAttribute("aria-controls");
    if (!targetId) return;
    var target = document.getElementById(targetId);
    if (!target) return;
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      if (expanded) {
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "view more…";
        target.classList.add("chart-details-collapsed");
      } else {
        btn.setAttribute("aria-expanded", "true");
        btn.textContent = "view less";
        target.classList.remove("chart-details-collapsed");
      }
    });
  });

  // Replay: render on scroll into view (or immediately as fallback)
  const replayContainer = document.getElementById("replay-cards");
  if (replayContainer) {
    const samples = (data.replays && data.replays.samples && data.replays.samples.length > 0)
      ? data.replays.samples
      : (window.dataLoader && window.dataLoader.FALLBACK_REPLAYS && window.dataLoader.FALLBACK_REPLAYS.samples) || [];
    if (samples && samples.length > 0) {
      function doRender() {
        try {
          window.replay.renderReplays(replayContainer, samples);
        } catch (e) {
          console.error("Replay:", e);
          replayContainer.innerHTML = "<p class=\"error\">Replay error.</p>";
        }
      }
      if (window.scrollTrigger && window.scrollTrigger.onScrollIntoView) {
        replayContainer.innerHTML = "<p class=\"replay-placeholder\">Scroll down to load replay samples…</p>";
        window.scrollTrigger.onScrollIntoView("#replay-section", doRender);
      } else {
        doRender();
      }
    } else {
      replayContainer.innerHTML = "<p class=\"replay-placeholder\">No replay samples available.</p>";
    }
  }
}

window.addEventListener("DOMContentLoaded", init);
