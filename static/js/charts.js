/** charts.js - D3 chart renderers for all 13 visualizations + legacy charts */

(function () {
  function getContainerWidth(container) {
    return Math.max(200, (container && container.offsetWidth) || 400);
  }

  var margin = { top: 28, right: 40, bottom: 80, left: 60 };
  var defaultTransition = 0;

  var COLORS = {
    baseline: "#94a3b8",
    tpu: "#3b82f6",
    gpu: "#8b5cf6",
    dflash: "#10b981",
    eagle3: "#f59e0b",
    accent: "#f97316"
  };

  var CATEGORY_COLORS = { math: "#3b82f6", code: "#10b981", chat: "#f43f5e" };

  function showTooltip(container, text, event) {
    var existing = document.querySelector(".chart-tooltip");
    if (existing) existing.remove();
    var tip = document.createElement("div");
    tip.className = "chart-tooltip";
    tip.textContent = text;
    document.body.appendChild(tip);
    if (event) {
      tip.style.left = (event.clientX + 12) + "px";
      tip.style.top = (event.clientY + 8) + "px";
    }
    return tip;
  }

  function hideTooltip() {
    var tip = document.querySelector(".chart-tooltip");
    if (tip) tip.remove();
  }

  // ═══════════════════════════════════════════
  // Fig 8: Summary Dashboard (dark panel)
  // ═══════════════════════════════════════════
  function renderSummaryDashboard(container, v5pData, gpuData) {
    if (!container || !v5pData || v5pData.length === 0) return;
    d3.select(container).selectAll("*").remove();

    var speedups = v5pData.map(function (r) { return parseFloat(r.tpu_speedup) || 0; });
    var tpsVals = v5pData.map(function (r) { return parseFloat(r.tpu_dflash_tps) || 0; });
    var datasets = v5pData.map(function (r) { return r.dataset; });
    var categories = v5pData.map(function (r) { return r.category; });

    var avgSpeedup = d3.mean(speedups);
    var peakSpeedup = d3.max(speedups);
    var peakSpeedupDs = datasets[speedups.indexOf(peakSpeedup)];
    var peakTps = d3.max(tpsVals);
    var peakTpsDs = datasets[tpsVals.indexOf(peakTps)];

    var tauPct = 94.9;
    if (gpuData && gpuData.length > 0) {
      var avgRow = gpuData.filter(function (r) { return r.dataset === "AVERAGE"; });
      if (avgRow.length > 0) {
        tauPct = parseFloat(avgRow[0].tau_pct_of_gpu) || 94.9;
      }
    }

    var wrapper = document.createElement("div");
    wrapper.className = "dashboard-panel";
    container.appendChild(wrapper);

    var title = document.createElement("div");
    title.className = "dashboard-title";
    title.textContent = "DFlash on TPU V5P — Final Results Summary";
    wrapper.appendChild(title);

    var kpiRow = document.createElement("div");
    kpiRow.className = "dashboard-kpis";
    var metrics = [
      { label: "Avg Speedup", value: avgSpeedup.toFixed(2) + "x", sub: "across 9 benchmarks", color: "#3b82f6" },
      { label: "Peak Speedup", value: peakSpeedup.toFixed(2) + "x", sub: "on " + peakSpeedupDs, color: "#10b981" },
      { label: "Peak Throughput", value: peakTps.toFixed(0), sub: "TPS on " + peakTpsDs, color: "#f59e0b" },
      { label: "GPU Tau Parity", value: tauPct.toFixed(1) + "%", sub: "math avg (vs A100)", color: "#8b5cf6" }
    ];
    metrics.forEach(function (m) {
      var card = document.createElement("div");
      card.className = "dashboard-kpi";
      card.innerHTML = '<div class="kpi-value" style="color:' + m.color + '">' + m.value + '</div>' +
        '<div class="kpi-label">' + m.label + '</div>' +
        '<div class="kpi-sub">' + m.sub + '</div>';
      kpiRow.appendChild(card);
    });
    wrapper.appendChild(kpiRow);

    var chartDiv = document.createElement("div");
    chartDiv.className = "dashboard-chart";
    wrapper.appendChild(chartDiv);

    var fullWidth = getContainerWidth(container) - 40;
    var barMargin = { top: 14, right: 70, bottom: 56, left: 100 };
    var w = fullWidth - barMargin.left - barMargin.right;
    var h = datasets.length * 40;

    var svg = d3.select(chartDiv).append("svg")
      .attr("width", w + barMargin.left + barMargin.right)
      .attr("height", h + barMargin.top + barMargin.bottom)
      .style("overflow", "visible");
    var g = svg.append("g").attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ")");

    var revDatasets = datasets.slice().reverse();
    var revSpeedups = speedups.slice().reverse();
    var revCategories = categories.slice().reverse();

    var y = d3.scaleBand().domain(revDatasets).range([0, h]).padding(0.25);
    var x = d3.scaleLinear().domain([0, d3.max(speedups) * 1.25]).range([0, w]);

    g.append("g").call(d3.axisLeft(y)).selectAll("text").attr("fill", "#64748b").attr("font-size", 14);
    g.append("g").attr("transform", "translate(0," + h + ")").call(d3.axisBottom(x).ticks(5))
      .selectAll("text").attr("fill", "#64748b");
    g.selectAll(".domain, .tick line").attr("stroke", "#e2e8f0");

    g.append("line").attr("x1", x(1)).attr("x2", x(1)).attr("y1", 0).attr("y2", h)
      .attr("stroke", "#cbd5e1").attr("stroke-dasharray", "4,4");
    g.append("line").attr("x1", x(avgSpeedup)).attr("x2", x(avgSpeedup)).attr("y1", 0).attr("y2", h)
      .attr("stroke", "#3b82f6").attr("stroke-width", 2).attr("stroke-dasharray", "6,3");
    g.append("text").attr("x", x(avgSpeedup) + 6).attr("y", h + 28)
      .attr("fill", "#3b82f6").attr("font-size", 14).attr("font-weight", 700)
      .text("avg " + avgSpeedup.toFixed(2) + "x");

    g.selectAll(".bar-speedup").data(revDatasets).enter().append("rect")
      .attr("x", 0).attr("y", function (d) { return y(d); })
      .attr("width", 0).attr("height", y.bandwidth())
      .attr("fill", function (d, i) { return CATEGORY_COLORS[revCategories[i]] || COLORS.tpu; })
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("mouseenter", function (ev, d) {
        var idx = revDatasets.indexOf(d);
        showTooltip(container, d + ": " + revSpeedups[idx].toFixed(2) + "x speedup", ev);
      })
      .on("mouseleave", function () { hideTooltip(); })
      .transition().duration(defaultTransition)
      .attr("width", function (d, i) { return x(revSpeedups[i]); });

    g.selectAll(".bar-label").data(revDatasets).enter().append("text")
      .attr("x", function (d, i) { return x(revSpeedups[i]) + 4; })
      .attr("y", function (d) { return y(d) + y.bandwidth() / 2 + 4; })
      .attr("fill", "#334155").attr("font-size", 13).attr("font-weight", 600)
      .text(function (d, i) { return revSpeedups[i].toFixed(2) + "x"; })
      .attr("opacity", 0).transition().delay(defaultTransition).attr("opacity", 1);
  }

  // ═══════════════════════════════════════════
  // Fig 1: V5P Speedup Bar
  // ═══════════════════════════════════════════
  function renderV5pSpeedup(container, data) {
    if (!container || !data || data.length === 0) return;
    d3.select(container).selectAll("*").remove();

    var datasets = data.map(function (r) { return r.dataset; });
    var categories = data.map(function (r) { return r.category; });
    var speedups = data.map(function (r) { return parseFloat(r.tpu_speedup) || 0; });
    var avgSpeedup = d3.mean(speedups);

    var width = getContainerWidth(container) - margin.left - margin.right;
    var height = 360;
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleBand().domain(datasets).range([0, width]).padding(0.25);
    var y = d3.scaleLinear().domain([0, d3.max(speedups) * 1.25]).range([height, 0]);

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x))
      .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end").attr("font-size", 13).attr("dx", "-0.4em").attr("dy", "0.2em");
    g.append("g").call(d3.axisLeft(y));

    g.append("line").attr("x1", 0).attr("x2", width).attr("y1", y(1)).attr("y2", y(1))
      .attr("stroke", "#cbd5e1").attr("stroke-dasharray", "6,4");
    g.append("line").attr("x1", 0).attr("x2", width).attr("y1", y(avgSpeedup)).attr("y2", y(avgSpeedup))
      .attr("stroke", COLORS.accent).attr("stroke-dasharray", "6,3").attr("stroke-width", 2);
    g.append("text").attr("x", width - 4).attr("y", y(avgSpeedup) - 6)
      .attr("text-anchor", "end").attr("font-size", 14).attr("fill", COLORS.accent).attr("font-weight", 600)
      .text("avg " + avgSpeedup.toFixed(2) + "x");

    container.style.position = "relative";
    g.selectAll(".bar-speedup").data(data).enter().append("rect")
      .attr("x", function (d) { return x(d.dataset); })
      .attr("y", height).attr("width", x.bandwidth()).attr("height", 0)
      .attr("fill", function (d) { return CATEGORY_COLORS[d.category] || COLORS.tpu; })
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("mouseenter", function (ev, d) {
        showTooltip(container, d.dataset + ": " + (parseFloat(d.tpu_speedup) || 0).toFixed(2) + "x speedup", ev);
      })
      .on("mouseleave", function () { hideTooltip(); })
      .transition().duration(defaultTransition)
      .attr("y", function (d) { return y(parseFloat(d.tpu_speedup) || 0); })
      .attr("height", function (d) { return height - y(parseFloat(d.tpu_speedup) || 0); });

    g.selectAll(".bar-val").data(data).enter().append("text")
      .attr("x", function (d) { return x(d.dataset) + x.bandwidth() / 2; })
      .attr("y", function (d) { return y(parseFloat(d.tpu_speedup) || 0) - 4; })
      .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600)
      .text(function (d) { return (parseFloat(d.tpu_speedup) || 0).toFixed(2) + "x"; });

    datasets.forEach(function (ds, i) {
      g.append("text").attr("x", x(ds) + x.bandwidth() / 2).attr("y", height + 58)
        .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600)
        .attr("fill", CATEGORY_COLORS[categories[i]] || "#64748b")
        .text(categories[i]);
    });

    g.append("text").attr("x", -height / 2).attr("y", -38).attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle").attr("font-size", 14).text("Speedup over baseline");
  }

  // ═══════════════════════════════════════════
  // Fig 2: V5P Throughput (Grouped Bar)
  // ═══════════════════════════════════════════
  function renderV5pThroughput(container, data) {
    if (!container || !data || data.length === 0) return;
    d3.select(container).selectAll("*").remove();

    var datasets = data.map(function (r) { return r.dataset; });
    var baseTps = data.map(function (r) { return parseFloat(r.tpu_baseline_tps) || 0; });
    var dfTps = data.map(function (r) { return parseFloat(r.tpu_dflash_tps) || 0; });

    var width = getContainerWidth(container) - margin.left - margin.right;
    var height = 360;
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x0 = d3.scaleBand().domain(datasets).range([0, width]).padding(0.2);
    var x1 = d3.scaleBand().domain(["baseline", "dflash"]).range([0, x0.bandwidth()]).padding(0.08);
    var yMax = d3.max(dfTps) * 1.2;
    var y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x0))
      .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end").attr("font-size", 13).attr("dx", "-0.4em").attr("dy", "0.2em");
    g.append("g").call(d3.axisLeft(y));

    container.style.position = "relative";
    var series = [
      { key: "baseline", label: "Baseline", color: COLORS.baseline, vals: baseTps },
      { key: "dflash", label: "DFlash", color: COLORS.tpu, vals: dfTps }
    ];
    series.forEach(function (s) {
      g.selectAll(".bar-" + s.key).data(datasets).enter().append("rect")
        .attr("x", function (d) { return x0(d) + x1(s.key); })
        .attr("y", height).attr("width", x1.bandwidth()).attr("height", 0)
        .attr("fill", s.color).attr("rx", 4)
        .style("cursor", "pointer")
        .on("mouseenter", function (ev, d) {
          var idx = datasets.indexOf(d);
          showTooltip(container, d + " " + s.label + ": " + s.vals[idx].toFixed(1) + " TPS", ev);
        })
        .on("mouseleave", function () { hideTooltip(); })
        .transition().duration(defaultTransition)
        .attr("y", function (d, i) { return y(s.vals[i]); })
        .attr("height", function (d, i) { return height - y(s.vals[i]); });
    });

    g.selectAll(".bar-val-df").data(datasets).enter().append("text")
      .attr("x", function (d) { return x0(d) + x1("dflash") + x1.bandwidth() / 2; })
      .attr("y", function (d, i) { return y(dfTps[i]) - 4; })
      .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600).attr("fill", COLORS.tpu)
      .text(function (d, i) { return dfTps[i].toFixed(0); });

    var legend = svg.append("g").attr("transform", "translate(" + margin.left + ",4)");
    series.forEach(function (s, i) {
      legend.append("rect").attr("x", i * 90).attr("y", 0).attr("width", 12).attr("height", 12).attr("fill", s.color).attr("rx", 4);
      legend.append("text").attr("x", i * 90 + 16).attr("y", 10).attr("font-size", 14).text(s.label);
    });

    g.append("text").attr("x", -height / 2).attr("y", -38).attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle").attr("font-size", 14).text("Tokens per Second (TPS)");
  }

  // ═══════════════════════════════════════════
  // Fig 3: Category Summary (3-panel)
  // ═══════════════════════════════════════════
  function renderCategorySummary(container, data) {
    if (!container || !data || data.length === 0) return;
    d3.select(container).selectAll("*").remove();

    var cats = { math: [], code: [], chat: [] };
    data.forEach(function (r) { if (cats[r.category]) cats[r.category].push(r); });

    var catNames = ["Math", "Code", "Chat"];
    var catKeys = ["math", "code", "chat"];
    var avgSpeedup = catKeys.map(function (k) { return d3.mean(cats[k].map(function (r) { return parseFloat(r.tpu_speedup) || 0; })); });
    var avgTau = catKeys.map(function (k) { return d3.mean(cats[k].map(function (r) { return parseFloat(r.tpu_tau) || 0; })); });
    var avgTps = catKeys.map(function (k) { return d3.mean(cats[k].map(function (r) { return parseFloat(r.tpu_dflash_tps) || 0; })); });

    var panels = [
      { title: "Avg Speedup", vals: avgSpeedup, ylabel: "Speedup (x)", fmt: function (v) { return v.toFixed(2) + "x"; } },
      { title: "Avg Tau", vals: avgTau, ylabel: "Tau (tokens)", fmt: function (v) { return v.toFixed(1); } },
      { title: "Avg DFlash TPS", vals: avgTps, ylabel: "Tokens/sec", fmt: function (v) { return v.toFixed(0); } }
    ];

    var fullWidth = getContainerWidth(container);
    var panelWidth = Math.floor(fullWidth / 3) - 12;

    container.style.position = "relative";
    container.style.display = "flex";
    container.style.gap = "8px";
    container.style.flexWrap = "wrap";

    panels.forEach(function (p) {
      var div = document.createElement("div");
      div.style.flex = "1";
      div.style.minWidth = "140px";
      container.appendChild(div);

      var w = Math.max(160, panelWidth) - margin.left - 20;
      var h = 340;
      var svg = d3.select(div).append("svg")
        .attr("width", w + margin.left + 20)
        .attr("height", h + margin.top + margin.bottom);
      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var x = d3.scaleBand().domain(catNames).range([0, w]).padding(0.3);
      var y = d3.scaleLinear().domain([0, d3.max(p.vals) * 1.3]).range([h, 0]);

      g.append("g").attr("transform", "translate(0," + h + ")").call(d3.axisBottom(x));
      g.append("g").call(d3.axisLeft(y).ticks(5));

      g.selectAll(".cat-bar").data(catNames).enter().append("rect")
        .attr("x", function (d) { return x(d); })
        .attr("y", h).attr("width", x.bandwidth()).attr("height", 0)
        .attr("fill", function (d, i) { return CATEGORY_COLORS[catKeys[i]]; })
        .attr("rx", 4)
        .style("cursor", "pointer")
        .on("mouseenter", function (ev, d) {
          var idx = catNames.indexOf(d);
          showTooltip(container, d + ": " + p.fmt(p.vals[idx]), ev);
        })
        .on("mouseleave", function () { hideTooltip(); })
        .transition().duration(defaultTransition)
        .attr("y", function (d, i) { return y(p.vals[i]); })
        .attr("height", function (d, i) { return h - y(p.vals[i]); });

      g.selectAll(".cat-lbl").data(catNames).enter().append("text")
        .attr("x", function (d) { return x(d) + x.bandwidth() / 2; })
        .attr("y", function (d, i) { return y(p.vals[i]) - 4; })
        .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600)
        .text(function (d, i) { return p.fmt(p.vals[i]); });

      svg.append("text").attr("x", (w + margin.left + 20) / 2).attr("y", 14)
        .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600)
        .text(p.title);
    });
  }

  // ═══════════════════════════════════════════
  // Fig 4: GPU Parity (Dual Panel)
  // ═══════════════════════════════════════════
  function renderGpuParity(container, data) {
    if (!container || !data || data.length === 0) return;
    d3.select(container).selectAll("*").remove();

    var rows = data.filter(function (r) { return r.dataset !== "AVERAGE"; });
    var avgRow = data.filter(function (r) { return r.dataset === "AVERAGE"; })[0];

    var datasets = rows.map(function (r) { return r.dataset; });
    var v5Tau = rows.map(function (r) { return parseFloat(r.v5p_tau) || 0; });
    var gpuTau = rows.map(function (r) { return parseFloat(r.gpu_paper_tau) || 0; });
    var tauPct = rows.map(function (r) { return parseFloat(r.tau_pct_of_gpu) || 0; });
    var v5Speedup = rows.map(function (r) { return parseFloat(r.v5p_speedup) || 0; });
    var gpuSpeedup = rows.map(function (r) { return parseFloat(r.gpu_paper_speedup) || 0; });

    var fullWidth = getContainerWidth(container);
    var halfWidth = Math.floor(fullWidth / 2) - 16;

    container.style.position = "relative";
    container.style.display = "flex";
    container.style.gap = "12px";
    container.style.flexWrap = "wrap";

    var panelConfigs = [
      {
        title: "Draft Quality Parity (Tau)",
        yLabel: "Tau (avg accepted tokens)",
        v5Vals: v5Tau, gpuVals: gpuTau, annotations: tauPct
      },
      {
        title: "End-to-End Speedup",
        yLabel: "Speedup over baseline",
        v5Vals: v5Speedup, gpuVals: gpuSpeedup, annotations: null
      }
    ];

    panelConfigs.forEach(function (cfg) {
      var div = document.createElement("div");
      div.style.flex = "1";
      div.style.minWidth = "260px";
      container.appendChild(div);

      var w = Math.max(200, halfWidth) - margin.left - margin.right;
      var h = 350;
      var svg = d3.select(div).append("svg")
        .attr("width", w + margin.left + margin.right)
        .attr("height", h + margin.top + margin.bottom);
      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var x0 = d3.scaleBand().domain(datasets).range([0, w]).padding(0.2);
      var x1 = d3.scaleBand().domain(["v5p", "gpu"]).range([0, x0.bandwidth()]).padding(0.08);
      var yMax = Math.max(d3.max(cfg.v5Vals), d3.max(cfg.gpuVals)) * 1.35;
      var y = d3.scaleLinear().domain([0, yMax]).range([h, 0]);

      g.append("g").attr("transform", "translate(0," + h + ")").call(d3.axisBottom(x0))
        .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end").attr("font-size", 13).attr("dx", "-0.4em").attr("dy", "0.2em");
      g.append("g").call(d3.axisLeft(y));

      var seriesData = [
        { key: "v5p", label: "TPU V5P", color: COLORS.tpu, vals: cfg.v5Vals },
        { key: "gpu", label: "GPU A100", color: COLORS.gpu, vals: cfg.gpuVals }
      ];
      seriesData.forEach(function (s) {
        g.selectAll(".bar-" + s.key).data(datasets).enter().append("rect")
          .attr("x", function (d) { return x0(d) + x1(s.key); })
          .attr("y", h).attr("width", x1.bandwidth()).attr("height", 0)
          .attr("fill", s.color).attr("rx", 4)
          .style("cursor", "pointer")
          .on("mouseenter", function (ev, d) {
            var idx = datasets.indexOf(d);
            showTooltip(container, d + " " + s.label + ": " + s.vals[idx].toFixed(2), ev);
          })
          .on("mouseleave", function () { hideTooltip(); })
          .transition().duration(defaultTransition)
          .attr("y", function (d, i) { return y(s.vals[i]); })
          .attr("height", function (d, i) { return h - y(s.vals[i]); });
      });

      if (cfg.annotations) {
        datasets.forEach(function (ds, i) {
          var pct = cfg.annotations[i];
          var color = pct >= 100 ? "#10b981" : (pct >= 90 ? "#f59e0b" : "#f43f5e");
          g.append("text")
            .attr("x", x0(ds) + x0.bandwidth() / 2)
            .attr("y", y(Math.max(cfg.v5Vals[i], cfg.gpuVals[i])) - 6)
            .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 600)
            .attr("fill", color).text(pct.toFixed(0) + "%");
        });
      } else {
        datasets.forEach(function (ds, i) {
          seriesData.forEach(function (s) {
            g.append("text")
              .attr("x", x0(ds) + x1(s.key) + x1.bandwidth() / 2)
              .attr("y", y(s.vals[i]) - 4)
              .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600)
              .text(s.vals[i].toFixed(2));
          });
        });
      }

      svg.append("text").attr("x", (w + margin.left + margin.right) / 2).attr("y", 14)
        .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600)
        .text(cfg.title);

      var legend = g.append("g").attr("transform", "translate(0," + (h + 36) + ")");
      seriesData.forEach(function (s, i) {
        legend.append("rect").attr("x", i * 100).attr("y", 0).attr("width", 10).attr("height", 10).attr("fill", s.color).attr("rx", 4);
        legend.append("text").attr("x", i * 100 + 14).attr("y", 9).attr("font-size", 13).text(s.label);
      });
    });
  }

  // ═══════════════════════════════════════════
  // Fig 5: Acceptance Decay Lines (replaces Chart 4)
  // ═══════════════════════════════════════════
  function renderAcceptanceDecay(container, data) {
    if (!container || !data || data.length === 0) return;
    d3.select(container).selectAll("*").remove();

    var positions = [];
    for (var i = 0; i <= 15; i++) positions.push(i);

    var seriesColors = [COLORS.tpu, COLORS.gpu, "#06b6d4", COLORS.dflash, COLORS.accent, "#f43f5e", COLORS.eagle3, "#6366f1", "#14b8a6"];

    var series = [];
    data.forEach(function (r, idx) {
      var points = positions.map(function (p) {
        var rate = parseFloat(r["pos_" + p]);
        return { pos: p, rate: isNaN(rate) ? 0 : rate };
      });
      series.push({ dataset: r.dataset, variant: r.variant || "tpu", points: points, colorIdx: idx });
    });

    var width = getContainerWidth(container) - margin.left - margin.right;
    var height = 360;
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleLinear().domain([0, 15]).range([0, width]);
    var y = d3.scaleLinear().domain([0, 1.05]).range([height, 0]);

    [0.25, 0.5, 0.75, 1.0].forEach(function (tick) {
      g.append("line").attr("x1", 0).attr("x2", width).attr("y1", y(tick)).attr("y2", y(tick))
        .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "4,3");
    });

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x).tickFormat(function (d) { return d; }))
      .selectAll("text").attr("font-size", 13);
    g.append("g").call(d3.axisLeft(y).tickFormat(d3.format(".0%")))
      .selectAll("text").attr("font-size", 13);
    g.selectAll(".domain, .tick line").attr("stroke", "#e2e8f0");

    g.append("text").attr("x", width / 2).attr("y", height + 42).attr("text-anchor", "middle").attr("font-size", 14).attr("fill", "#475569").text("Draft Token Position");
    g.append("text").attr("x", -height / 2).attr("y", -42).attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle").attr("font-size", 14).attr("fill", "#475569").text("Acceptance Rate");

    var line = d3.line().x(function (d) { return x(d.pos); }).y(function (d) { return y(d.rate); }).curve(d3.curveMonotoneX);

    var legend = svg.append("g").attr("transform", "translate(" + margin.left + ",4)");
    var xOff = 0;
    series.forEach(function (s) {
      var color = seriesColors[s.colorIdx % seriesColors.length];
      legend.append("line").attr("x1", xOff).attr("x2", xOff + 16).attr("y1", 6).attr("y2", 6)
        .attr("stroke", color).attr("stroke-width", 2.5);
      legend.append("text").attr("x", xOff + 20).attr("y", 10).attr("font-size", 13).attr("fill", "#475569")
        .text(s.dataset);
      xOff += 90;
    });

    container.style.position = "relative";
    series.forEach(function (s) {
      var color = seriesColors[s.colorIdx % seriesColors.length];
      var path = g.append("path").datum(s.points)
        .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2.5).attr("d", line);
      var node = path.node();
      var len = node ? node.getTotalLength() : 0;
      path.attr("stroke-dasharray", len).attr("stroke-dashoffset", len)
        .transition().duration(defaultTransition * 2).attr("stroke-dashoffset", 0)
        .on("end", function () { d3.select(this).attr("stroke-dasharray", "none"); });

      g.selectAll(".dot-" + s.dataset).data(s.points).enter().append("circle")
        .attr("cx", function (d) { return x(d.pos); }).attr("cy", function (d) { return y(d.rate); })
        .attr("r", 3.5).attr("fill", color).attr("stroke", "#fff").attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .on("mouseenter", function (ev, d) {
          showTooltip(container, s.dataset + " pos " + d.pos + ": " + (d.rate * 100).toFixed(1) + "%", ev);
        })
        .on("mouseleave", function () { hideTooltip(); });
    });
  }

  // ═══════════════════════════════════════════
  // Fig 6: Latency TPOT Bar
  // ═══════════════════════════════════════════
  function renderLatency(container, data) {
    if (!container || !data || data.length === 0) return;
    d3.select(container).selectAll("*").remove();

    var datasets = data.map(function (r) { return r.dataset; });
    var baseTpot = data.map(function (r) { return parseFloat(r.tpu_baseline_tpot_ms) || 0; });
    var dfTpot = data.map(function (r) { return parseFloat(r.tpu_dflash_tpot_ms) || 0; });

    var width = getContainerWidth(container) - margin.left - margin.right;
    var height = 360;
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x0 = d3.scaleBand().domain(datasets).range([0, width]).padding(0.2);
    var x1 = d3.scaleBand().domain(["baseline", "dflash"]).range([0, x0.bandwidth()]).padding(0.08);
    var yMax = d3.max(baseTpot) * 1.2;
    var y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x0))
      .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end").attr("font-size", 13).attr("dx", "-0.4em").attr("dy", "0.2em");
    g.append("g").call(d3.axisLeft(y));

    container.style.position = "relative";
    var series = [
      { key: "baseline", label: "Baseline", color: COLORS.baseline, vals: baseTpot },
      { key: "dflash", label: "DFlash", color: COLORS.tpu, vals: dfTpot }
    ];
    series.forEach(function (s) {
      g.selectAll(".bar-" + s.key).data(datasets).enter().append("rect")
        .attr("x", function (d) { return x0(d) + x1(s.key); })
        .attr("y", height).attr("width", x1.bandwidth()).attr("height", 0)
        .attr("fill", s.color).attr("rx", 4)
        .style("cursor", "pointer")
        .on("mouseenter", function (ev, d) {
          var idx = datasets.indexOf(d);
          showTooltip(container, d + " " + s.label + ": " + s.vals[idx].toFixed(2) + " ms", ev);
        })
        .on("mouseleave", function () { hideTooltip(); })
        .transition().duration(defaultTransition)
        .attr("y", function (d, i) { return y(s.vals[i]); })
        .attr("height", function (d, i) { return height - y(s.vals[i]); });
    });

    g.selectAll(".bar-val-df").data(datasets).enter().append("text")
      .attr("x", function (d) { return x0(d) + x1("dflash") + x1.bandwidth() / 2; })
      .attr("y", function (d, i) { return y(dfTpot[i]) - 4; })
      .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600).attr("fill", COLORS.tpu)
      .text(function (d, i) { return dfTpot[i].toFixed(2); });

    var bestIdx = dfTpot.indexOf(d3.min(dfTpot));
    g.append("text").attr("x", width - 4).attr("y", y(d3.max(baseTpot) * 0.5))
      .attr("text-anchor", "end").attr("font-size", 14).attr("fill", COLORS.accent).attr("font-weight", 600)
      .text("best: " + d3.min(dfTpot).toFixed(2) + " ms (" + datasets[bestIdx] + ")");

    g.append("text").attr("x", -height / 2).attr("y", -38).attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle").attr("font-size", 14).text("TPOT (ms) — lower is better");

    var legend = svg.append("g").attr("transform", "translate(" + margin.left + ",4)");
    series.forEach(function (s, i) {
      legend.append("rect").attr("x", i * 90).attr("y", 0).attr("width", 12).attr("height", 12).attr("fill", s.color).attr("rx", 4);
      legend.append("text").attr("x", i * 90 + 16).attr("y", 10).attr("font-size", 14).text(s.label);
    });
  }

  // ═══════════════════════════════════════════
  // Fig 7: Output Quality Bar
  // ═══════════════════════════════════════════
  function renderOutputQuality(container, data) {
    if (!container || !data || data.length === 0) return;
    d3.select(container).selectAll("*").remove();

    var datasets = data.map(function (r) { return r.dataset; });
    var categories = data.map(function (r) { return r.category; });
    var matchRates = data.map(function (r) { return parseFloat((r.match_rate || "0").replace("%", "")) || 0; });
    var exactMatches = data.map(function (r) { return r.exact_match || ""; });

    var width = getContainerWidth(container) - margin.left - margin.right;
    var height = 360;
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleBand().domain(datasets).range([0, width]).padding(0.25);
    var y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x))
      .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end").attr("font-size", 13).attr("dx", "-0.4em").attr("dy", "0.2em");
    g.append("g").call(d3.axisLeft(y).tickFormat(function (d) { return d + "%"; }));

    g.append("line").attr("x1", 0).attr("x2", width).attr("y1", y(50)).attr("y2", y(50))
      .attr("stroke", "#cbd5e1").attr("stroke-dasharray", "6,4");

    container.style.position = "relative";
    g.selectAll(".bar-quality").data(data).enter().append("rect")
      .attr("x", function (d) { return x(d.dataset); })
      .attr("y", height).attr("width", x.bandwidth()).attr("height", 0)
      .attr("fill", function (d) { return CATEGORY_COLORS[d.category] || COLORS.baseline; })
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("mouseenter", function (ev, d) {
        var rate = parseFloat((d.match_rate || "0").replace("%", "")) || 0;
        showTooltip(container, d.dataset + ": " + rate.toFixed(1) + "% match (" + (d.exact_match || "") + ")", ev);
      })
      .on("mouseleave", function () { hideTooltip(); })
      .transition().duration(defaultTransition)
      .attr("y", function (d, i) { return y(matchRates[i]); })
      .attr("height", function (d, i) { return height - y(matchRates[i]); });

    g.selectAll(".bar-lbl").data(datasets).enter().append("text")
      .attr("x", function (d) { return x(d) + x.bandwidth() / 2; })
      .attr("y", function (d, i) { return y(matchRates[i]) - 4; })
      .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600)
      .text(function (d, i) { return exactMatches[i]; });

    g.append("text").attr("x", -height / 2).attr("y", -38).attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle").attr("font-size", 14).text("Exact Token Match Rate (%)");

    var catLegend = svg.append("g").attr("transform", "translate(" + margin.left + ",4)");
    ["math", "code", "chat"].forEach(function (c, i) {
      catLegend.append("rect").attr("x", i * 70).attr("y", 0).attr("width", 10).attr("height", 10)
        .attr("fill", CATEGORY_COLORS[c]).attr("rx", 4);
      catLegend.append("text").attr("x", i * 70 + 14).attr("y", 9).attr("font-size", 13)
        .text(c.charAt(0).toUpperCase() + c.slice(1));
    });
  }

  // ═══════════════════════════════════════════
  // Fig 9: V5P vs V4 Speedup
  // ═══════════════════════════════════════════
  function renderV5pVsV4(container, v5pData, v4Data) {
    if (!container || !v5pData || v5pData.length === 0) return;
    d3.select(container).selectAll("*").remove();

    var datasets = v5pData.map(function (r) { return r.dataset; });
    var categories = v5pData.map(function (r) { return r.category; });
    var v5pSpeedup = v5pData.map(function (r) { return parseFloat(r.tpu_speedup) || 0; });

    var v4ByDs = {};
    if (v4Data) v4Data.forEach(function (r) { v4ByDs[r.dataset] = r; });
    var v4Speedup = datasets.map(function (d) {
      return v4ByDs[d] ? (parseFloat(v4ByDs[d].tpu_speedup) || 0) : 0;
    });

    var width = getContainerWidth(container) - margin.left - margin.right;
    var height = 360;
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x0 = d3.scaleBand().domain(datasets).range([0, width]).padding(0.2);
    var x1 = d3.scaleBand().domain(["v4", "v5p"]).range([0, x0.bandwidth()]).padding(0.08);
    var yMax = Math.max(d3.max(v5pSpeedup), d3.max(v4Speedup)) * 1.25;
    var y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x0))
      .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end").attr("font-size", 13).attr("dx", "-0.4em").attr("dy", "0.2em");
    g.append("g").call(d3.axisLeft(y));

    g.append("line").attr("x1", 0).attr("x2", width).attr("y1", y(1)).attr("y2", y(1))
      .attr("stroke", "#cbd5e1").attr("stroke-dasharray", "6,4");

    container.style.position = "relative";
    var series = [
      { key: "v4", label: "TPU V4", color: "#64748b", vals: v4Speedup },
      { key: "v5p", label: "TPU V5P", color: COLORS.tpu, vals: v5pSpeedup }
    ];
    series.forEach(function (s) {
      g.selectAll(".bar-" + s.key).data(datasets).enter().append("rect")
        .attr("x", function (d) { return x0(d) + x1(s.key); })
        .attr("y", height).attr("width", x1.bandwidth()).attr("height", 0)
        .attr("fill", s.color).attr("rx", 4)
        .style("cursor", "pointer")
        .on("mouseenter", function (ev, d) {
          var idx = datasets.indexOf(d);
          showTooltip(container, d + " " + s.label + ": " + s.vals[idx].toFixed(2) + "x", ev);
        })
        .on("mouseleave", function () { hideTooltip(); })
        .transition().duration(defaultTransition)
        .attr("y", function (d, i) { return y(s.vals[i]); })
        .attr("height", function (d, i) { return height - y(s.vals[i]); });

      g.selectAll(".lbl-" + s.key).data(datasets).enter().append("text")
        .attr("x", function (d) { return x0(d) + x1(s.key) + x1.bandwidth() / 2; })
        .attr("y", function (d, i) { return y(s.vals[i]) - 4; })
        .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 600)
        .text(function (d, i) { return s.vals[i].toFixed(2); });
    });

    datasets.forEach(function (ds, i) {
      g.append("text").attr("x", x0(ds) + x0.bandwidth() / 2).attr("y", height + 58)
        .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600)
        .attr("fill", CATEGORY_COLORS[categories[i]] || "#64748b").text(categories[i]);
    });

    g.append("text").attr("x", -height / 2).attr("y", -38).attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle").attr("font-size", 14).text("Speedup over baseline");

    var legend = svg.append("g").attr("transform", "translate(" + margin.left + ",4)");
    series.forEach(function (s, i) {
      legend.append("rect").attr("x", i * 90).attr("y", 0).attr("width", 12).attr("height", 12).attr("fill", s.color).attr("rx", 4);
      legend.append("text").attr("x", i * 90 + 16).attr("y", 10).attr("font-size", 14).text(s.label);
    });
  }

  // ═══════════════════════════════════════════
  // Fig 10: V4 Improvement Factors
  // ═══════════════════════════════════════════
  function renderV4Improvement(container, data) {
    if (!container || !data || data.length === 0) return;
    d3.select(container).selectAll("*").remove();

    var datasets = data.map(function (r) { return r.dataset; });
    var baselineImp = data.map(function (r) { return parseFloat((r.baseline_improvement || "0").replace("x", "")) || 0; });
    var dflashImp = data.map(function (r) { return parseFloat((r.dflash_improvement || "0").replace("x", "")) || 0; });

    var width = getContainerWidth(container) - margin.left - margin.right;
    var height = 360;
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x0 = d3.scaleBand().domain(datasets).range([0, width]).padding(0.2);
    var x1 = d3.scaleBand().domain(["baseline", "dflash"]).range([0, x0.bandwidth()]).padding(0.08);
    var yMax = Math.max(d3.max(baselineImp), d3.max(dflashImp)) * 1.25;
    var y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x0))
      .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end").attr("font-size", 13).attr("dx", "-0.4em").attr("dy", "0.2em");
    g.append("g").call(d3.axisLeft(y));

    g.append("line").attr("x1", 0).attr("x2", width).attr("y1", y(1)).attr("y2", y(1))
      .attr("stroke", "#cbd5e1").attr("stroke-dasharray", "6,4");

    container.style.position = "relative";
    var series = [
      { key: "baseline", label: "Baseline Improvement", color: COLORS.baseline, vals: baselineImp },
      { key: "dflash", label: "DFlash Improvement", color: COLORS.tpu, vals: dflashImp }
    ];
    series.forEach(function (s) {
      g.selectAll(".bar-" + s.key).data(datasets).enter().append("rect")
        .attr("x", function (d) { return x0(d) + x1(s.key); })
        .attr("y", height).attr("width", x1.bandwidth()).attr("height", 0)
        .attr("fill", s.color).attr("rx", 4)
        .style("cursor", "pointer")
        .on("mouseenter", function (ev, d) {
          var idx = datasets.indexOf(d);
          showTooltip(container, d + " " + s.label + ": " + s.vals[idx].toFixed(2) + "x", ev);
        })
        .on("mouseleave", function () { hideTooltip(); })
        .transition().duration(defaultTransition)
        .attr("y", function (d, i) { return y(s.vals[i]); })
        .attr("height", function (d, i) { return height - y(s.vals[i]); });

      g.selectAll(".lbl-" + s.key).data(datasets).enter().append("text")
        .attr("x", function (d) { return x0(d) + x1(s.key) + x1.bandwidth() / 2; })
        .attr("y", function (d, i) { return y(s.vals[i]) - 4; })
        .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600)
        .text(function (d, i) { return s.vals[i].toFixed(2) + "x"; });
    });

    g.append("text").attr("x", -height / 2).attr("y", -38).attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle").attr("font-size", 14).text("Improvement Factor (V5P / V4)");

    var legend = svg.append("g").attr("transform", "translate(" + margin.left + ",4)");
    series.forEach(function (s, i) {
      legend.append("rect").attr("x", i * 150).attr("y", 0).attr("width", 12).attr("height", 12).attr("fill", s.color).attr("rx", 4);
      legend.append("text").attr("x", i * 150 + 16).attr("y", 10).attr("font-size", 14).text(s.label);
    });
  }

  // ═══════════════════════════════════════════
  // Fig 11: Profiling Pie + Horizontal Bar
  // ═══════════════════════════════════════════
  function renderProfiling(container, data) {
    if (!container || !data || !data.summary) return;
    d3.select(container).selectAll("*").remove();

    var s = data.summary;
    var components = [
      { label: "Draft Forward", value: s.draft_forward.mean_ms },
      { label: "Draft Sample", value: s.draft_sample.mean_ms },
      { label: "Verify Forward", value: s.verify_forward.mean_ms },
      { label: "Acceptance", value: s.acceptance.mean_ms },
      { label: "Host-Device Xfer", value: s.host_device_xfer.mean_ms },
      { label: "Aux Projection", value: s.aux_projection.mean_ms },
      { label: "Ctx Update", value: s.ctx_update.mean_ms },
      { label: "Cache Mgmt", value: s.cache_mgmt.mean_ms }
    ];
    var total = d3.sum(components, function (c) { return c.value; });

    var set2 = ["#3b82f6", "#10b981", "#f97316", "#f43f5e", "#8b5cf6", "#f59e0b", "#06b6d4", "#94a3b8"];

    container.style.position = "relative";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "8px";
    container.style.overflow = "visible";

    var pieDiv = document.createElement("div");
    pieDiv.style.display = "flex";
    pieDiv.style.justifyContent = "center";
    pieDiv.style.overflow = "visible";
    container.appendChild(pieDiv);

    var pieSize = 140;
    var piePad = 60;
    var pieSvgW = pieSize + piePad * 2;
    var pieSvg = d3.select(pieDiv).append("svg")
      .attr("width", pieSvgW).attr("height", pieSize + 40)
      .style("overflow", "visible").style("max-width", "100%");
    var pieG = pieSvg.append("g").attr("transform", "translate(" + pieSvgW / 2 + "," + (pieSize / 2 + 24) + ")");

    var pie = d3.pie().value(function (d) { return d.value; }).sort(null);
    var radius = pieSize / 2;
    var arc = d3.arc().innerRadius(0).outerRadius(radius - 6);
    var arcHover = d3.arc().innerRadius(0).outerRadius(radius);
    var labelArc = d3.arc().innerRadius(radius + 6).outerRadius(radius + 6);

    pieG.selectAll("path").data(pie(components)).enter().append("path")
      .attr("d", arc)
      .attr("fill", function (d, i) { return set2[i]; })
      .attr("stroke", "#fff").attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", function (ev, d) {
        d3.select(this).transition().duration(100).attr("d", arcHover);
        showTooltip(container, d.data.label + ": " + d.data.value.toFixed(2) + " ms (" + (d.data.value / total * 100).toFixed(1) + "%)", ev);
      })
      .on("mouseleave", function (ev, d) {
        d3.select(this).transition().duration(100).attr("d", arc);
        hideTooltip();
      });

    pieG.selectAll(".pie-label").data(pie(components)).enter().append("text")
      .attr("class", "pie-label")
      .attr("transform", function (d) {
        var pct = d.data.value / total * 100;
        if (pct > 8) return "translate(" + arc.centroid(d) + ")";
        return "translate(" + labelArc.centroid(d) + ")";
      })
      .attr("text-anchor", function (d) {
        var pct = d.data.value / total * 100;
        if (pct > 8) return "middle";
        var mid = (d.startAngle + d.endAngle) / 2;
        return mid < Math.PI ? "start" : "end";
      })
      .attr("font-size", 14).attr("fill", function (d) {
        return (d.data.value / total * 100) > 8 ? "#fff" : "#334155";
      })
      .attr("font-weight", function (d) { return (d.data.value / total * 100) > 8 ? 600 : 400; })
      .text(function (d) { return (d.data.value / total * 100) > 3 ? (d.data.value / total * 100).toFixed(0) + "%" : ""; });

    pieSvg.append("text").attr("x", pieSvgW / 2).attr("y", 14)
      .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600)
      .text("Proportion of Step Time");

    var barDiv = document.createElement("div");
    barDiv.style.overflow = "visible";
    container.appendChild(barDiv);

    var barMargin = { top: 26, right: 50, bottom: 20, left: 100 };
    var revComp = components.slice().reverse();
    var bw = getContainerWidth(container) - barMargin.left - barMargin.right;
    if (bw < 80) bw = 150;
    var bh = revComp.length * 24;

    var barSvg = d3.select(barDiv).append("svg")
      .attr("width", bw + barMargin.left + barMargin.right)
      .attr("height", bh + barMargin.top + barMargin.bottom)
      .style("overflow", "visible").style("max-width", "100%");
    var barG = barSvg.append("g").attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ")");

    var yBar = d3.scaleBand().domain(revComp.map(function (c) { return c.label; })).range([0, bh]).padding(0.3);
    var xBar = d3.scaleLinear().domain([0, d3.max(components, function (c) { return c.value; }) * 1.2]).range([0, bw]);

    barG.append("g").call(d3.axisLeft(yBar)).selectAll("text").attr("font-size", 14);
    barG.append("g").attr("transform", "translate(0," + bh + ")").call(d3.axisBottom(xBar).ticks(5));

    barG.selectAll(".prof-bar").data(revComp).enter().append("rect")
      .attr("x", 0).attr("y", function (d) { return yBar(d.label); })
      .attr("width", 0).attr("height", yBar.bandwidth())
      .attr("fill", function (d, i) { return set2[revComp.length - 1 - i]; })
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("mouseenter", function (ev, d) {
        showTooltip(container, d.label + ": " + d.value.toFixed(2) + " ms", ev);
      })
      .on("mouseleave", function () { hideTooltip(); })
      .transition().duration(defaultTransition)
      .attr("width", function (d) { return xBar(d.value); });

    barG.selectAll(".prof-lbl").data(revComp).enter().append("text")
      .attr("x", function (d) { return xBar(d.value) + 4; })
      .attr("y", function (d) { return yBar(d.label) + yBar.bandwidth() / 2 + 4; })
      .attr("font-size", 14).text(function (d) { return d.value.toFixed(2) + " ms"; });

    barSvg.append("text").attr("x", (bw + barMargin.left + barMargin.right) / 2).attr("y", 16)
      .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600)
      .text("Per-Component Latency (total ~ " + total.toFixed(1) + " ms)");
  }

  // ═══════════════════════════════════════════
  // Fig 12: Method Comparison
  // ═══════════════════════════════════════════
  function renderMethodComparison(container, vllmData, v4Data) {
    if (!container) return;
    d3.select(container).selectAll("*").remove();

    var mathDatasets = ["gsm8k", "math500", "aime24", "aime25"];

    var standaloneSpeedup = {};
    if (v4Data) v4Data.forEach(function (r) {
      if (mathDatasets.indexOf(r.dataset) >= 0) standaloneSpeedup[r.dataset] = parseFloat(r.tpu_speedup) || 0;
    });

    var vllmSpeedup = {};
    var eagleSpeedup = {};
    if (vllmData) vllmData.forEach(function (r) {
      if (mathDatasets.indexOf(r.dataset) >= 0) {
        if (r.method === "dflash") vllmSpeedup[r.dataset] = parseFloat(r.speedup) || 0;
        if (r.method === "eagle3") eagleSpeedup[r.dataset] = parseFloat(r.speedup) || 0;
      }
    });

    var datasets = mathDatasets.filter(function (d) { return standaloneSpeedup[d] || vllmSpeedup[d]; });
    if (datasets.length === 0) return;

    var sVals = datasets.map(function (d) { return standaloneSpeedup[d] || 0; });
    var vVals = datasets.map(function (d) { return vllmSpeedup[d] || 0; });
    var eVals = datasets.map(function (d) { return eagleSpeedup[d] || 0; });

    var width = getContainerWidth(container) - margin.left - margin.right;
    var height = 360;
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x0 = d3.scaleBand().domain(datasets).range([0, width]).padding(0.2);
    var x1 = d3.scaleBand().domain(["standalone", "vllm", "eagle3"]).range([0, x0.bandwidth()]).padding(0.05);
    var allVals = sVals.concat(vVals).concat(eVals).filter(function (v) { return v > 0; });
    if (allVals.length === 0) return;
    var yMax = d3.max(allVals) * 1.3;
    var y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x0))
      .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end").attr("font-size", 13).attr("dx", "-0.4em").attr("dy", "0.2em");
    g.append("g").call(d3.axisLeft(y));

    g.append("line").attr("x1", 0).attr("x2", width).attr("y1", y(1)).attr("y2", y(1))
      .attr("stroke", "#cbd5e1").attr("stroke-dasharray", "6,4");

    container.style.position = "relative";
    var methods = [
      { key: "standalone", label: "DFlash Standalone", color: COLORS.tpu, vals: sVals },
      { key: "vllm", label: "DFlash vLLM Pipeline", color: COLORS.dflash, vals: vVals },
      { key: "eagle3", label: "Eagle3 (Llama)", color: COLORS.eagle3, vals: eVals }
    ];
    methods.forEach(function (m) {
      g.selectAll(".bar-" + m.key).data(datasets).enter().append("rect")
        .attr("x", function (d) { return x0(d) + x1(m.key); })
        .attr("y", height).attr("width", x1.bandwidth()).attr("height", 0)
        .attr("fill", m.color).attr("rx", 4)
        .style("cursor", "pointer")
        .on("mouseenter", function (ev, d) {
          var idx = datasets.indexOf(d);
          showTooltip(container, d + " " + m.label + ": " + m.vals[idx].toFixed(2) + "x", ev);
        })
        .on("mouseleave", function () { hideTooltip(); })
        .transition().duration(defaultTransition)
        .attr("y", function (d, i) { return y(m.vals[i]); })
        .attr("height", function (d, i) { return height - y(m.vals[i]); });

      g.selectAll(".lbl-" + m.key).data(datasets).enter().append("text")
        .attr("x", function (d) { return x0(d) + x1(m.key) + x1.bandwidth() / 2; })
        .attr("y", function (d, i) { return y(m.vals[i]) - 3; })
        .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 600)
        .text(function (d, i) { return m.vals[i] > 0 ? m.vals[i].toFixed(2) : ""; });
    });

    g.append("text").attr("x", -height / 2).attr("y", -38).attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle").attr("font-size", 14).text("Speedup over Baseline");

    var legend = svg.append("g").attr("transform", "translate(" + margin.left + ",4)");
    methods.forEach(function (m, i) {
      legend.append("rect").attr("x", i * 140).attr("y", 0).attr("width", 12).attr("height", 12).attr("fill", m.color).attr("rx", 4);
      legend.append("text").attr("x", i * 140 + 16).attr("y", 10).attr("font-size", 13).text(m.label);
    });
  }

  // ═══════════════════════════════════════════
  // Fig 13: Cost Efficiency (Dual Panel)
  // ═══════════════════════════════════════════
  function renderCostEfficiency(container, v5pData, v4Data, gpuData) {
    if (!container || !v5pData || v5pData.length === 0) return;
    d3.select(container).selectAll("*").remove();

    var COST_V5P = 2.10, COST_V4 = 3.22, COST_A100 = 5.07, GPU_BASELINE_TPS = 100;

    container.style.position = "relative";

    var datasets = v5pData.map(function (r) { return r.dataset; });
    var categories = v5pData.map(function (r) { return r.category; });
    var v5pTps = v5pData.map(function (r) { return parseFloat(r.tpu_dflash_tps) || 0; });

    var v4ByDs = {};
    if (v4Data) v4Data.forEach(function (r) { v4ByDs[r.dataset] = r; });
    var v4Tps = datasets.map(function (d) { return v4ByDs[d] ? (parseFloat(v4ByDs[d].tpu_dflash_tps) || 0) : 0; });

    var gpuByDs = {};
    if (gpuData) gpuData.forEach(function (r) { if (r.dataset !== "AVERAGE") gpuByDs[r.dataset] = r; });

    var gpuTps = datasets.map(function (d) {
      if (gpuByDs[d]) return GPU_BASELINE_TPS * (parseFloat(gpuByDs[d].gpu_paper_speedup) || 0);
      return 0;
    });

    var costPerM = function (costPerHr, tps) { return tps > 0 ? (costPerHr / (tps * 3600) * 1e6) : 0; };
    var v5pCost = v5pTps.map(function (t) { return costPerM(COST_V5P, t); });
    var v4Cost = v4Tps.map(function (t) { return costPerM(COST_V4, t); });
    var gpuCost = gpuTps.map(function (t) { return costPerM(COST_A100, t); });

    var tokenW = getContainerWidth(container) - margin.left - margin.right;
    if (tokenW < 200) tokenW = 300;
    var tokenH = 300;
    var tokenSvg = d3.select(container).append("svg")
      .attr("width", tokenW + margin.left + margin.right)
      .attr("height", tokenH + margin.top + margin.bottom + 30);
    var tokenG = tokenSvg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x0t = d3.scaleBand().domain(datasets).range([0, tokenW]).padding(0.15);
    var x1t = d3.scaleBand().domain(["v5p", "v4", "gpu"]).range([0, x0t.bandwidth()]).padding(0.05);
    var allCosts = v5pCost.concat(v4Cost).concat(gpuCost).filter(function (c) { return c > 0; });
    var yMaxCost = allCosts.length > 0 ? d3.max(allCosts) * 1.25 : 5;
    var yToken = d3.scaleLinear().domain([0, yMaxCost]).range([tokenH, 0]);

    tokenG.append("g").attr("transform", "translate(0," + tokenH + ")").call(d3.axisBottom(x0t))
      .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end").attr("font-size", 13).attr("dx", "-0.4em").attr("dy", "0.2em");
    tokenG.append("g").call(d3.axisLeft(yToken).ticks(5));

    var costSeries = [
      { key: "v5p", label: "TPU V5P ($2.10/hr)", color: COLORS.tpu, vals: v5pCost },
      { key: "v4", label: "TPU V4 ($3.22/hr)", color: "#64748b", vals: v4Cost },
      { key: "gpu", label: "GPU A100 ($5.07/hr, est.)", color: COLORS.gpu, vals: gpuCost }
    ];

    // Render all bars first
    costSeries.forEach(function (s) {
      tokenG.selectAll(".bar-" + s.key).data(datasets).enter().append("rect")
        .attr("x", function (d) { return x0t(d) + x1t(s.key); })
        .attr("y", tokenH).attr("width", x1t.bandwidth()).attr("height", 0)
        .attr("fill", s.color).attr("rx", 4)
        .attr("opacity", s.key === "gpu" ? 0.85 : 1)
        .style("cursor", "pointer")
        .on("mouseenter", function (ev, d) {
          var idx = datasets.indexOf(d);
          var cost = s.vals[idx];
          showTooltip(container, d + " " + s.label + ": $" + (cost > 0 ? cost.toFixed(2) : "N/A") + "/M tokens", ev);
        })
        .on("mouseleave", function () { hideTooltip(); })
        .transition().duration(defaultTransition)
        .attr("y", function (d, i) { return yToken(s.vals[i]); })
        .attr("height", function (d, i) { return tokenH - yToken(s.vals[i]); });
    });

    // Average line on top of bars
    var avgV5pCost = d3.mean(v5pCost);
    tokenG.append("line").attr("x1", 0).attr("x2", tokenW)
      .attr("y1", yToken(avgV5pCost)).attr("y2", yToken(avgV5pCost))
      .attr("stroke", COLORS.accent).attr("stroke-width", 2).attr("stroke-dasharray", "6,3");
    tokenG.append("rect")
      .attr("x", tokenW - 128).attr("y", yToken(avgV5pCost) - 18)
      .attr("width", 124).attr("height", 16).attr("rx", 4)
      .attr("fill", "#fff").attr("opacity", 0.9);
    tokenG.append("text").attr("x", tokenW - 4).attr("y", yToken(avgV5pCost) - 6)
      .attr("text-anchor", "end").attr("font-size", 14).attr("fill", COLORS.accent).attr("font-weight", 700)
      .text("V5P avg $" + avgV5pCost.toFixed(2) + "/M");

    // All labels last so they render on top of everything
    var narrow = x1t.bandwidth() < 22;
    costSeries.forEach(function (s) {
      tokenG.selectAll(".lbl-" + s.key).data(datasets).enter().append("text")
        .attr("x", function (d) { return x0t(d) + x1t(s.key) + x1t.bandwidth() / 2; })
        .attr("y", function (d, i) { return s.vals[i] > 0 ? yToken(s.vals[i]) - 4 : tokenH; })
        .attr("text-anchor", narrow ? "start" : "middle")
        .attr("font-size", narrow ? 6.5 : 7).attr("font-weight", 700)
        .attr("fill", "#1a1a1a")
        .attr("paint-order", "stroke").attr("stroke", "#fff").attr("stroke-width", 2.5)
        .attr("transform", function (d, i) {
          if (!narrow || s.vals[i] <= 0) return null;
          var cx = x0t(d) + x1t(s.key) + x1t.bandwidth() / 2;
          var cy = s.vals[i] > 0 ? yToken(s.vals[i]) - 4 : tokenH;
          return "rotate(-60," + cx + "," + cy + ")";
        })
        .text(function (d, i) {
          if (s.vals[i] <= 0) return "";
          return "$" + s.vals[i].toFixed(2);
        });
    });

    datasets.forEach(function (ds, i) {
      tokenG.append("text").attr("x", x0t(ds) + x0t.bandwidth() / 2).attr("y", tokenH + 58)
        .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600)
        .attr("fill", CATEGORY_COLORS[categories[i]] || "#64748b").text(categories[i]);
    });

    tokenG.append("text").attr("x", -tokenH / 2).attr("y", -38).attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle").attr("font-size", 14).text("Cost per Million Tokens ($)");

    tokenSvg.append("text").attr("x", (tokenW + margin.left + margin.right) / 2).attr("y", 14)
      .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600)
      .text("DFlash Cost Efficiency by Benchmark");

    var costLegend = tokenSvg.append("g").attr("transform", "translate(" + margin.left + "," + (tokenH + margin.top + margin.bottom + 8) + ")");
    costSeries.forEach(function (s, i) {
      costLegend.append("rect").attr("x", i * 160).attr("y", 0).attr("width", 10).attr("height", 10).attr("fill", s.color).attr("rx", 4);
      costLegend.append("text").attr("x", i * 160 + 14).attr("y", 9).attr("font-size", 14).text(s.label);
    });
  }

  // ═══════════════════════════════════════════
  // Legacy Charts
  // ═══════════════════════════════════════════

  function renderStandaloneTpuVsGpu(container, data) {
    if (!container || !data || data.length === 0) return;
    var rows = data.filter(function (r) { return r.dataset !== "AVERAGE"; });
    if (rows.length === 0) rows = data;

    var width = getContainerWidth(container) - margin.left - margin.right;
    var height = 360;

    d3.select(container).selectAll("*").remove();
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var datasets = rows.map(function (r) { return r.dataset; });
    var keys = ["tpu", "gpu"];
    var x0 = d3.scaleBand().domain(datasets).range([0, width]).padding(0.25);
    var x1 = d3.scaleBand().domain(keys).range([0, x0.bandwidth()]).padding(0.08);
    var yMax = Math.max(
      d3.max(rows, function (r) { return parseFloat(r.tpu_dflash_tps) || 0; }),
      d3.max(rows, function (r) { return parseFloat(r.gpu_dflash_tps) || 0; })
    ) * 1.15 || 600;
    var y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x0))
      .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end").attr("font-size", 13).attr("dx", "-0.4em").attr("dy", "0.2em");
    g.append("g").call(d3.axisLeft(y)).selectAll("text").attr("font-size", 13);
    g.selectAll(".domain, .tick line").attr("stroke", "#e2e8f0");

    g.append("text").attr("x", -height / 2).attr("y", -42).attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle").attr("font-size", 14).attr("fill", "#475569").text("Tokens per Second");

    var barColors = { tpu: COLORS.tpu, gpu: COLORS.gpu };
    var barFields = { tpu: "tpu_dflash_tps", gpu: "gpu_dflash_tps" };
    var barLabels = { tpu: "TPU DFlash", gpu: "GPU DFlash" };

    container.style.position = "relative";
    keys.forEach(function (key) {
      g.selectAll(".bar-" + key).data(rows).enter().append("rect")
        .attr("x", function (d) { return x0(d.dataset) + x1(key); })
        .attr("y", height).attr("width", x1.bandwidth()).attr("height", 0)
        .attr("rx", 4).attr("fill", barColors[key])
        .style("cursor", "pointer")
        .on("mouseenter", function (ev, d) {
          showTooltip(container, d.dataset + " · " + barLabels[key] + ": " + (parseFloat(d[barFields[key]]) || 0).toFixed(1) + " TPS", ev);
        })
        .on("mouseleave", function () { hideTooltip(); })
        .transition().duration(defaultTransition)
        .attr("y", function (d) { return y(parseFloat(d[barFields[key]]) || 0); })
        .attr("height", function (d) { return height - y(parseFloat(d[barFields[key]]) || 0); });

      g.selectAll(".lbl-" + key).data(rows).enter().append("text")
        .attr("x", function (d) { return x0(d.dataset) + x1(key) + x1.bandwidth() / 2; })
        .attr("y", function (d) { return y(parseFloat(d[barFields[key]]) || 0) - 5; })
        .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 600).attr("fill", "#475569")
        .text(function (d) { var v = parseFloat(d[barFields[key]]); return v ? v.toFixed(0) : ""; });
    });

    var legend = svg.append("g").attr("transform", "translate(" + margin.left + ",4)");
    keys.forEach(function (key, i) {
      legend.append("rect").attr("x", i * 110).attr("y", 0).attr("width", 12).attr("height", 12).attr("rx", 4).attr("fill", barColors[key]);
      legend.append("text").attr("x", i * 110 + 16).attr("y", 10).attr("font-size", 13).attr("fill", "#475569").text(barLabels[key]);
    });
  }
  function renderVllmPipelineTps(container, data) {
    if (!container || !data || data.length === 0) return;
    var rows = data.filter(function (r) { return r.dataset !== "OVERALL"; });
    if (rows.length === 0) rows = data;
    var baseline = rows.filter(function (r) { return r.method === "baseline"; });
    var dflash = rows.filter(function (r) { return r.method === "dflash"; });
    var eagle3 = rows.filter(function (r) { return r.method === "eagle3"; });
    var datasets = baseline.map(function (r) { return r.dataset; });

    var width = getContainerWidth(container) - margin.left - margin.right;
    var height = 360;

    d3.select(container).selectAll("*").remove();
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x0 = d3.scaleBand().domain(datasets).range([0, width]).padding(0.2);
    var x1 = d3.scaleBand().domain(["baseline", "dflash", "eagle3"]).range([0, x0.bandwidth()]).padding(0.08);
    var yMax = d3.max(data, function (r) { return parseFloat(r.tps) || 0; }) * 1.15 || 250;
    var y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x0))
      .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end").attr("font-size", 13).attr("dx", "-0.4em").attr("dy", "0.2em");
    g.append("g").call(d3.axisLeft(y)).selectAll("text").attr("font-size", 13);
    g.selectAll(".domain, .tick line").attr("stroke", "#e2e8f0");

    g.append("text").attr("x", -height / 2).attr("y", -42).attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle").attr("font-size", 14).attr("fill", "#475569").text("Tokens per Second");

    var methods = [
      { key: "baseline", label: "Baseline", color: COLORS.baseline, src: baseline },
      { key: "dflash", label: "DFlash (TPU)", color: COLORS.tpu, src: dflash },
      { key: "eagle3", label: "Eagle3", color: COLORS.eagle3, src: eagle3 }
    ];
    container.style.position = "relative";
    methods.forEach(function (m) {
      g.selectAll(".bar-" + m.key).data(m.src).enter().append("rect")
        .attr("x", function (d) { return x0(d.dataset) + x1(m.key); })
        .attr("y", height).attr("width", x1.bandwidth()).attr("height", 0)
        .attr("rx", 4).attr("fill", m.color)
        .style("cursor", "pointer")
        .on("mouseenter", function (ev, d) {
          var tps = parseFloat(d.tps) || 0;
          var spd = parseFloat(d.speedup) || 0;
          showTooltip(container, d.dataset + " · " + m.label + ": " + tps.toFixed(1) + " TPS" + (spd > 0 ? " (" + spd.toFixed(2) + "×)" : ""), ev);
        })
        .on("mouseleave", function () { hideTooltip(); })
        .transition().duration(defaultTransition)
        .attr("y", function (d) { return y(parseFloat(d.tps) || 0); })
        .attr("height", function (d) { return height - y(parseFloat(d.tps) || 0); });

      g.selectAll(".lbl-" + m.key).data(m.src).enter().append("text")
        .attr("x", function (d) { return x0(d.dataset) + x1(m.key) + x1.bandwidth() / 2; })
        .attr("y", function (d) { return y(parseFloat(d.tps) || 0) - 5; })
        .attr("text-anchor", "middle").attr("font-size", 11).attr("font-weight", 600).attr("fill", "#475569")
        .text(function (d) { var v = parseFloat(d.tps); return v ? v.toFixed(0) : ""; });
    });

    var legend = svg.append("g").attr("transform", "translate(" + margin.left + ",4)");
    methods.forEach(function (m, i) {
      legend.append("rect").attr("x", i * 110).attr("y", 0).attr("width", 12).attr("height", 12).attr("rx", 4).attr("fill", m.color);
      legend.append("text").attr("x", i * 110 + 16).attr("y", 10).attr("font-size", 13).attr("fill", "#475569").text(m.label);
    });
  }

  var CHART3_LABELS = {
    gpu_dflash_standalone: "GPU stand.",
    tpu_dflash_standalone: "TPU stand.",
    tpu_dflash_vllm: "TPU vLLM",
    tpu_eagle3_vllm: "Eagle3 vLLM"
  };

  function renderAcceptanceAnalysis(container, data) {
    if (!container || !data || data.length === 0) return;

    var width = getContainerWidth(container) - margin.left - margin.right;
    var height = 360;

    var tauMax = d3.max(data, function (r) { return parseFloat(r.tau) || 0; }) * 1.2 || 8;
    var draftsMax = d3.max(data, function (r) { return parseFloat(r.drafts_per_second) || 0; }) * 1.1 || 70;

    d3.select(container).selectAll("*").remove();
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var methods = data.map(function (d, i) { return d.method || ("method_" + i); });
    var x0 = d3.scaleBand().domain(methods).range([0, width]).padding(0.3);
    var x1 = d3.scaleLinear().domain([0, draftsMax]).range([0, Math.max(0, x0.bandwidth() - 4)]);
    var y = d3.scaleLinear().domain([0, tauMax]).range([height, 0]);

    var colors = { gpu_dflash_standalone: COLORS.gpu, tpu_dflash_standalone: COLORS.tpu, tpu_dflash_vllm: COLORS.dflash, tpu_eagle3_vllm: COLORS.eagle3 };

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x0).tickFormat(function (m) { return CHART3_LABELS[m] || m; }))
      .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end").attr("font-size", 13).attr("dx", "-0.4em").attr("dy", "0.2em");
    g.append("g").call(d3.axisLeft(y)).selectAll("text").attr("font-size", 13);
    g.selectAll(".domain, .tick line").attr("stroke", "#e2e8f0");

    g.append("text").attr("x", -height / 2).attr("y", -42).attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle").attr("font-size", 14).attr("fill", "#475569").text("Tau (avg accepted tokens)");

    var idx = methods.indexOf("tpu_dflash_vllm");
    if (idx > 0) {
      var sepX = (x0(methods[idx - 1]) + x0.bandwidth() + x0("tpu_dflash_vllm")) / 2;
      g.append("line")
        .attr("x1", sepX).attr("x2", sepX)
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", "#cbd5e1").attr("stroke-dasharray", "6,4");
    }

    container.style.position = "relative";
    data.forEach(function (d, i) {
      var tau = parseFloat(d.tau) || 0;
      var drafts = parseFloat(d.drafts_per_second) || 0;
      var accepted = parseFloat(d.accepted_tps) || 0;
      var method = d.method || ("method_" + i);
      var barWidth = x1(drafts);
      var barHeight = height - y(tau);
      var slotCenter = x0(method) + x0.bandwidth() / 2;
      var barX = slotCenter - barWidth / 2;
      var rect = g.append("rect")
        .attr("x", slotCenter).attr("y", y(tau))
        .attr("width", 0).attr("height", barHeight)
        .attr("rx", 4)
        .attr("fill", colors[method] || COLORS.baseline)
        .style("cursor", "pointer")
        .on("mouseenter", function (ev) {
          showTooltip(container, "\u03c4=" + tau.toFixed(1) + ", drafts/sec=" + drafts.toFixed(1) + ", TPS=" + accepted.toFixed(0), ev);
        })
        .on("mouseleave", function () { hideTooltip(); });
      rect.transition().duration(defaultTransition)
        .attr("x", barX).attr("width", barWidth);

      g.append("text")
        .attr("x", slotCenter).attr("y", y(tau) - 5)
        .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 600).attr("fill", "#475569")
        .text("\u03c4=" + tau.toFixed(1));
    });

    var legendLabels = { gpu_dflash_standalone: "GPU stand.", tpu_dflash_standalone: "TPU stand.", tpu_dflash_vllm: "TPU vLLM", tpu_eagle3_vllm: "Eagle3 vLLM" };
    var legend = svg.append("g").attr("transform", "translate(" + margin.left + ",4)");
    data.forEach(function (d, i) {
      var method = d.method || ("method_" + i);
      legend.append("rect").attr("x", i * 90).attr("y", 0).attr("width", 12).attr("height", 12).attr("rx", 4).attr("fill", colors[method] || COLORS.baseline);
      legend.append("text").attr("x", i * 90 + 16).attr("y", 10).attr("font-size", 13).attr("fill", "#475569").text(legendLabels[method] || method);
    });
  }

  window.charts = {
    renderVllmPipelineTps: renderVllmPipelineTps,
    renderStandaloneTpuVsGpu: renderStandaloneTpuVsGpu,
    renderAcceptanceAnalysis: renderAcceptanceAnalysis,
    renderSummaryDashboard: renderSummaryDashboard,
    renderV5pSpeedup: renderV5pSpeedup,
    renderV5pThroughput: renderV5pThroughput,
    renderCategorySummary: renderCategorySummary,
    renderGpuParity: renderGpuParity,
    renderAcceptanceDecay: renderAcceptanceDecay,
    renderLatency: renderLatency,
    renderOutputQuality: renderOutputQuality,
    renderV5pVsV4: renderV5pVsV4,
    renderV4Improvement: renderV4Improvement,
    renderProfiling: renderProfiling,
    renderMethodComparison: renderMethodComparison,
    renderCostEfficiency: renderCostEfficiency,
  };
})();
