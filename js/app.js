/** app.js - Orchestrator: load data, render charts, carousel nav, scroll-triggered replay */

var CHART_RENDERERS = [
  { id: "vllm-pipeline-tps-chart",    render: function (el, d) { window.charts.renderVllmPipelineTps(el, d.vllmPipelineTps); },           need: function (d) { return d.vllmPipelineTps && d.vllmPipelineTps.length > 0; } },
  { id: "standalone-tpu-vs-gpu-chart", render: function (el, d) { window.charts.renderStandaloneTpuVsGpu(el, d.standaloneTpuVsGpu); },     need: function (d) { return d.standaloneTpuVsGpu && d.standaloneTpuVsGpu.length > 0; } },
  { id: "acceptance-analysis-chart",   render: function (el, d) { window.charts.renderAcceptanceAnalysis(el, d.acceptanceAnalysis); },      need: function (d) { return d.acceptanceAnalysis && d.acceptanceAnalysis.length > 0; } },
  { id: "acceptance-gpu-vs-tpu-chart", render: function (el, d) { window.charts.renderAcceptanceDecay(el, d.acceptanceGpuVsTpu); },        need: function (d) { return d.acceptanceGpuVsTpu && d.acceptanceGpuVsTpu.length > 0; } },
  { id: "v5p-speedup-chart",          render: function (el, d) { window.charts.renderV5pSpeedup(el, d.v5pStandaloneAll); },                need: function (d) { return d.v5pStandaloneAll && d.v5pStandaloneAll.length > 0; } },
  { id: "v5p-category-chart",         render: function (el, d) { window.charts.renderCategorySummary(el, d.v5pStandaloneAll); },           need: function (d) { return d.v5pStandaloneAll && d.v5pStandaloneAll.length > 0; } },
  { id: "v5p-gpu-parity-chart",       render: function (el, d) { window.charts.renderGpuParity(el, d.v5pVsGpuPaper); },                   need: function (d) { return d.v5pVsGpuPaper && d.v5pVsGpuPaper.length > 0; } },
  { id: "v5p-output-quality-chart",   render: function (el, d) { window.charts.renderOutputQuality(el, d.v5pStandaloneAll); },             need: function (d) { return d.v5pStandaloneAll && d.v5pStandaloneAll.length > 0; } },
];

var STANDALONE_CHARTS = {
  "summary-dashboard-chart": function (el, d) { window.charts.renderSummaryDashboard(el, d.v5pStandaloneAll, d.v5pVsGpuPaper); },
  "profiling-chart": function (el, d) { if (d.profilingGsm8k) window.charts.renderProfiling(el, d.profilingGsm8k); },
  "method-comparison-chart": function (el, d) { window.charts.renderMethodComparison(el, d.vllmPipelineTps, d.v4StandaloneAll); },
  "v5p-vs-v4-chart": function (el, d) { window.charts.renderV5pVsV4(el, d.v5pStandaloneAll, d.v4StandaloneAll); },
  "cost-efficiency-chart": function (el, d) { window.charts.renderCostEfficiency(el, d.v5pStandaloneAll, d.v4StandaloneAll, d.v5pVsGpuPaper); }
};

function renderChart(index, data) {
  var spec = CHART_RENDERERS[index];
  if (!spec) return;
  var el = document.getElementById(spec.id);
  if (!el || !spec.need(data)) return;
  try { spec.render(el, data); } catch (e) { console.error("Chart " + index + ":", e); }
}

function renderDashboard(data) {
  var dashboardEl = document.getElementById("summary-dashboard-chart");
  if (dashboardEl && data.v5pStandaloneAll && data.v5pStandaloneAll.length > 0) {
    try { window.charts.renderSummaryDashboard(dashboardEl, data.v5pStandaloneAll, data.v5pVsGpuPaper); } catch (e) { console.error("Dashboard:", e); }
  }
}

function initCarousel(data) {
  var slides = document.querySelectorAll("#chart-carousel .carousel-slide");
  var prevBtn = document.getElementById("carousel-prev");
  var nextBtn = document.getElementById("carousel-next");
  var indicator = document.getElementById("carousel-indicator");
  if (!slides.length || !prevBtn || !nextBtn || !indicator) return;

  var current = 0;
  var total = slides.length;

  var carouselEl = document.getElementById("chart-carousel");

  function goTo(idx, scroll) {
    slides[current].classList.remove("active");
    current = idx;
    slides[current].classList.add("active");
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === total - 1;
    indicator.textContent = (current + 1) + " / " + total;
    renderChart(current, data);
    if (scroll && carouselEl) {
      var header = document.querySelector(".site-header");
      var offset = header ? header.offsetHeight + 16 : 16;
      var top = carouselEl.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: top, behavior: "smooth" });
    }
  }

  prevBtn.addEventListener("click", function () { if (current > 0) goTo(current - 1, true); });
  nextBtn.addEventListener("click", function () { if (current < total - 1) goTo(current + 1, true); });

  renderChart(0, data);
  prevBtn.disabled = true;
  nextBtn.disabled = total <= 1;
  indicator.textContent = "1 / " + total;
}

function renderConclusionCharts(data) {
  var profEl = document.getElementById("profiling-chart");
  if (profEl && data.profilingGsm8k) {
    try { window.charts.renderProfiling(profEl, data.profilingGsm8k); } catch (e) { console.error("Profiling:", e); }
  }
  var methodEl = document.getElementById("method-comparison-chart");
  if (methodEl) {
    try { window.charts.renderMethodComparison(methodEl, data.vllmPipelineTps, data.v4StandaloneAll); } catch (e) { console.error("MethodComp:", e); }
  }
  var v5v4El = document.getElementById("v5p-vs-v4-chart");
  if (v5v4El && data.v5pStandaloneAll && data.v5pStandaloneAll.length > 0) {
    try { window.charts.renderV5pVsV4(v5v4El, data.v5pStandaloneAll, data.v4StandaloneAll); } catch (e) { console.error("V5PvsV4:", e); }
  }
  var costEl = document.getElementById("cost-efficiency-chart");
  if (costEl && data.v5pStandaloneAll && data.v5pStandaloneAll.length > 0) {
    try { window.charts.renderCostEfficiency(costEl, data.v5pStandaloneAll, data.v4StandaloneAll, data.v5pVsGpuPaper); } catch (e) { console.error("CostEff:", e); }
  }
}

function renderAllVisibleCharts(data) {
  renderDashboard(data);
  var activeSlide = document.querySelector("#chart-carousel .carousel-slide.active");
  if (activeSlide) {
    var idx = parseInt(activeSlide.getAttribute("data-slide"), 10);
    renderChart(idx, data);
  }
  renderConclusionCharts(data);
}

function setupChartReplay(data) {
  window.scrollTrigger.onChartVisible(function (el) {
    var id = el.id;
    if (!id) return;

    // Carousel charts
    for (var i = 0; i < CHART_RENDERERS.length; i++) {
      if (CHART_RENDERERS[i].id === id && CHART_RENDERERS[i].need(data)) {
        try { CHART_RENDERERS[i].render(el, data); } catch (e) { console.error("Replay " + id + ":", e); }
        return;
      }
    }

    // Standalone charts (dashboard, conclusion)
    if (STANDALONE_CHARTS[id]) {
      try { STANDALONE_CHARTS[id](el, data); } catch (e) { console.error("Replay " + id + ":", e); }
    }
  });

  window.scrollTrigger.initChartReplay();
}

async function init() {
  // Scroll fade-in/fade-out — runs before data load so page is never blank
  if (window.scrollTrigger && window.scrollTrigger.initFadeOnScroll) {
    window.scrollTrigger.initFadeOnScroll();
  }

  const data = await window.dataLoader.loadData();

  renderDashboard(data);
  initCarousel(data);
  renderConclusionCharts(data);

  // Re-render charts with animation every time they scroll into view
  if (window.scrollTrigger && window.scrollTrigger.onChartVisible) {
    setupChartReplay(data);
  }

  let resizeTimeout;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      renderAllVisibleCharts(data);
    }, 150);
  });

  document.querySelectorAll(".chart-view-more").forEach(function (btn) {
    var targetId = btn.getAttribute("aria-controls");
    if (!targetId) return;
    var target = document.getElementById(targetId);
    if (!target) return;
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      if (expanded) {
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "view more\u2026";
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
        replayContainer.innerHTML = "<p class=\"replay-placeholder\">Scroll down to load replay samples\u2026</p>";
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
