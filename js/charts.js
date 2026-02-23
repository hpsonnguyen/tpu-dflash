/** charts.js - D3 chart renderers; consistent colors, hover tooltips */

(function () {
  function getContainerWidth(container) {
    return Math.max(200, (container && container.offsetWidth) || 400);
  }

  var margin = { top: 20, right: 30, bottom: 50, left: 50 };
  var defaultTransition = 400;

  var COLORS = {
    baseline: "#64748b",
    tpu: "#3b82f6",
    gpu: "#8b5cf6",
    dflash: "#10b981",
    eagle3: "#f59e0b"
  };

  function showTooltip(container, text, event) {
    var existing = document.querySelector(".chart-tooltip");
    if (existing) existing.remove();
    var tip = document.createElement("div");
    tip.className = "chart-tooltip";
    tip.textContent = text;
    document.body.appendChild(tip);
    if (event) {
      var x = event.clientX, y = event.clientY;
      tip.style.left = (x + 12) + "px";
      tip.style.top = (y + 8) + "px";
    }
    return tip;
  }

  function hideTooltip() {
    var tip = document.querySelector(".chart-tooltip");
    if (tip) tip.remove();
  }

  function bindTooltip(container, el, text) {
    el.on("mouseenter", function (event) {
      var tip = showTooltip(container, text);
      tip.style.left = (event.offsetX + 12) + "px";
      tip.style.top = (event.offsetY + 8) + "px";
    }).on("mouseleave", function () { hideTooltip(container); });
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
    var height = 280;

    d3.select(container).selectAll("*").remove();
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x0 = d3.scaleBand().domain(datasets).range([0, width]).padding(0.2);
    var x1 = d3.scaleBand().domain(["baseline", "dflash", "eagle3"]).range([0, x0.bandwidth()]).padding(0.05);
    var yMax = d3.max(data, function (r) { return parseFloat(r.tps) || 0; }) * 1.1 || 250;
    var y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x0))
      .selectAll("text").attr("transform", "rotate(-20)").style("text-anchor", "end");
    g.append("g").call(d3.axisLeft(y));

    var methods = [
      { key: "baseline", label: "Baseline", color: COLORS.baseline, src: baseline },
      { key: "dflash", label: "DFlash (TPU)", color: COLORS.tpu, src: dflash },
      { key: "eagle3", label: "Eagle3", color: COLORS.eagle3, src: eagle3 }
    ];
    container.style.position = "relative";
    methods.forEach(function (m) {
      g.selectAll(".bar-" + m.key).data(m.src).enter().append("rect")
        .attr("class", "bar bar-" + m.key)
        .attr("x", function (d) { return x0(d.dataset) + x1(m.key); })
        .attr("y", height).attr("width", x1.bandwidth()).attr("height", 0)
        .attr("fill", m.color)
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
    });

    var legend = svg.append("g").attr("transform", "translate(" + margin.left + ",0)");
    methods.forEach(function (m, i) {
      legend.append("rect").attr("x", i * 100).attr("y", 0).attr("width", 12).attr("height", 12).attr("fill", m.color);
      legend.append("text").attr("x", i * 100 + 16).attr("y", 10).attr("font-size", 11).text(m.label);
    });
  }

  function renderStandaloneTpuVsGpu(container, data) {
    if (!container || !data || data.length === 0) return;
    var rows = data.filter(function (r) { return r.dataset !== "AVERAGE"; });
    if (rows.length === 0) rows = data;

    var width = getContainerWidth(container) - margin.left - margin.right;
    var height = 260;

    d3.select(container).selectAll("*").remove();
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var datasets = rows.map(function (r) { return r.dataset; });
    var x = d3.scaleBand().domain(datasets).range([0, width]).padding(0.3);
    var yMax = Math.max(
      d3.max(rows, function (r) { return parseFloat(r.tpu_dflash_tps) || 0; }),
      d3.max(rows, function (r) { return parseFloat(r.gpu_dflash_tps) || 0; })
    ) * 1.1 || 600;
    var y = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x))
      .selectAll("text").attr("transform", "rotate(-20)").style("text-anchor", "end");
    g.append("g").call(d3.axisLeft(y));

    container.style.position = "relative";
    g.selectAll(".bar-tpu").data(rows).enter().append("rect")
      .attr("class", "bar bar-tpu")
      .attr("x", function (d) { return x(d.dataset); })
      .attr("y", height).attr("width", x.bandwidth() / 2 - 4).attr("height", 0).attr("fill", COLORS.tpu)
      .style("cursor", "pointer")
      .on("mouseenter", function (ev, d) {
        showTooltip(container, d.dataset + " · TPU DFlash: " + (parseFloat(d.tpu_dflash_tps) || 0).toFixed(1) + " TPS", ev);
      })
      .on("mouseleave", function () { hideTooltip(); })
      .transition().duration(defaultTransition)
      .attr("y", function (d) { return y(parseFloat(d.tpu_dflash_tps) || 0); })
      .attr("height", function (d) { return height - y(parseFloat(d.tpu_dflash_tps) || 0); });

    g.selectAll(".bar-gpu").data(rows).enter().append("rect")
      .attr("class", "bar bar-gpu")
      .attr("x", function (d) { return x(d.dataset) + x.bandwidth() / 2; })
      .attr("y", height).attr("width", x.bandwidth() / 2 - 4).attr("height", 0).attr("fill", COLORS.gpu)
      .style("cursor", "pointer")
      .on("mouseenter", function (ev, d) {
        showTooltip(container, d.dataset + " · GPU DFlash: " + (parseFloat(d.gpu_dflash_tps) || 0).toFixed(1) + " TPS", ev);
      })
      .on("mouseleave", function () { hideTooltip(); })
      .transition().duration(defaultTransition)
      .attr("y", function (d) { return y(parseFloat(d.gpu_dflash_tps) || 0); })
      .attr("height", function (d) { return height - y(parseFloat(d.gpu_dflash_tps) || 0); });

    var legend = svg.append("g").attr("transform", "translate(" + margin.left + ",0)");
    legend.append("rect").attr("x", 0).attr("y", 0).attr("width", 12).attr("height", 12).attr("fill", COLORS.tpu);
    legend.append("text").attr("x", 16).attr("y", 10).attr("font-size", 11).text("TPU DFlash");
    legend.append("rect").attr("x", 110).attr("y", 0).attr("width", 12).attr("height", 12).attr("fill", COLORS.gpu);
    legend.append("text").attr("x", 126).attr("y", 10).attr("font-size", 11).text("GPU DFlash");
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
    var height = 260;
    var bottomExtra = 20;

    var tauMax = d3.max(data, function (r) { return parseFloat(r.tau) || 0; }) * 1.2 || 8;
    var draftsMax = d3.max(data, function (r) { return parseFloat(r.drafts_per_second) || 0; }) * 1.1 || 70;

    d3.select(container).selectAll("*").remove();
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom + bottomExtra);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var methods = data.map(function (d, i) { return d.method || ("method_" + i); });
    var x0 = d3.scaleBand().domain(methods).range([0, width]).padding(0.3);
    var x1 = d3.scaleLinear().domain([0, draftsMax]).range([0, Math.max(0, x0.bandwidth() - 4)]);
    var y = d3.scaleLinear().domain([0, tauMax]).range([height, 0]);

    var colors = { gpu_dflash_standalone: COLORS.gpu, tpu_dflash_standalone: COLORS.tpu, tpu_dflash_vllm: COLORS.tpu, tpu_eagle3_vllm: COLORS.eagle3 };

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x0).tickFormat(function (m) { return CHART3_LABELS[m] || m; }))
      .selectAll("text").attr("transform", "rotate(-20)").style("text-anchor", "end");
    g.append("g").call(d3.axisLeft(y));

    var idx = methods.indexOf("tpu_dflash_vllm");
    if (idx > 0) {
      var sepX = (x0(methods[idx - 1]) + x0.bandwidth() + x0("tpu_dflash_vllm")) / 2;
      g.append("line")
        .attr("x1", sepX).attr("x2", sepX)
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4")
        .attr("opacity", 0.5);
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
        .attr("fill", colors[method] || COLORS.baseline)
        .attr("opacity", 0.85)
        .style("cursor", "pointer")
        .on("mouseover", function (ev) {
          showTooltip(container, "τ=" + tau.toFixed(1) + ", drafts/sec=" + drafts.toFixed(1) + ", TPS=" + accepted.toFixed(0), ev);
        })
        .on("mouseout", function () { hideTooltip(); });
      rect.transition().duration(defaultTransition)
        .attr("x", barX)
        .attr("width", barWidth);
    });

    var legendLabels = { gpu_dflash_standalone: "GPU stand.", tpu_dflash_standalone: "TPU stand.", tpu_dflash_vllm: "TPU vLLM", tpu_eagle3_vllm: "Eagle3 vLLM" };
    var legend = svg.append("g").attr("transform", "translate(" + margin.left + ",0)");
    data.forEach(function (d, i) {
      var method = d.method || ("method_" + i);
      legend.append("rect").attr("x", i * 78).attr("y", 0).attr("width", 12).attr("height", 12).attr("fill", colors[method] || COLORS.baseline);
      legend.append("text").attr("x", i * 78 + 16).attr("y", 10).attr("font-size", 10).text(legendLabels[method] || method);
    });
  }

  function renderAcceptanceGpuVsTpu(container, data) {
    if (!container || !data || data.length === 0) return;

    var fullWidth = getContainerWidth(container) - margin.left - margin.right;
    var width = Math.max(150, fullWidth);
    var height = 260;

    var positions = [];
    for (var i = 0; i <= 15; i++) positions.push(i);

    var series = [];
    data.forEach(function (r) {
      var points = positions.map(function (p) {
        var k = "pos_" + p;
        var rate = parseFloat(r[k]);
        return { pos: p, rate: isNaN(rate) ? 0 : rate, dataset: r.dataset, variant: r.variant };
      });
      series.push({ dataset: r.dataset, variant: r.variant, points: points });
    });

    var dsColors = { gsm8k: COLORS.tpu, math500: COLORS.dflash, aime24: COLORS.eagle3, aime25: "#ef4444" };
    var x = d3.scaleLinear().domain([0, 15]).range([0, width]);
    var y = d3.scaleLinear().domain([0, 1.05]).range([height, 0]);

    d3.select(container).selectAll("*").remove();
    var legendHeight = 28;
    var svg = d3.select(container).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom + legendHeight);
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    g.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x).tickFormat(function (d) { return d; }));
    g.append("g").call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

    var line = d3.line().x(function (d) { return x(d.pos); }).y(function (d) { return y(d.rate); }).curve(d3.curveMonotoneX);

    container.style.position = "relative";
    series.forEach(function (s) {
      var strokeColor = dsColors[s.dataset] || COLORS.baseline;
      var isGpu = s.variant === "gpu";
      var path = g.append("path").datum(s.points)
        .attr("fill", "none")
        .attr("stroke", strokeColor)
        .attr("stroke-width", 2)
        .attr("opacity", 0.9)
        .style("cursor", "pointer")
        .attr("d", line);
      var node = path.node();
      var len = (node && typeof node.getTotalLength === "function") ? node.getTotalLength() : 0;
      path.attr("stroke-dasharray", len).attr("stroke-dashoffset", len)
        .transition().duration(defaultTransition)
        .attr("stroke-dashoffset", 0)
        .on("end", function () {
          d3.select(this).attr("stroke-dasharray", isGpu ? "5,3" : "none");
        });
      path.on("mousemove", function (ev) {
        var pt = d3.pointer(ev, g.node());
        var posIdx = Math.round(x.invert(pt[0]));
        if (posIdx >= 0 && posIdx <= 15 && s.points[posIdx] != null) {
          var p = s.points[posIdx];
          showTooltip(container, s.dataset + " " + (isGpu ? "GPU" : "TPU") + ", pos " + p.pos + ": " + (p.rate * 100).toFixed(1) + "%", ev);
        }
      }).on("mouseleave", function () { hideTooltip(); });
    });

    var legendY = height + margin.top + margin.bottom - 4;
    var legend = svg.append("g").attr("transform", "translate(" + margin.left + ", " + legendY + ")");
    var datasets = series.reduce(function (acc, s) {
      if (acc.indexOf(s.dataset) < 0) acc.push(s.dataset);
      return acc;
    }, []);
    var xOff = 0;
    legend.append("text").attr("x", xOff).attr("y", 0).attr("font-size", 10).attr("font-weight", 600).text("GPU (dashed)");
    xOff += 80;
    legend.append("text").attr("x", xOff).attr("y", 0).attr("font-size", 10).attr("font-weight", 600).text("TPU (solid)");
    xOff += 80;
    datasets.forEach(function (ds) {
      legend.append("rect").attr("x", xOff).attr("y", -8).attr("width", 10).attr("height", 8).attr("fill", dsColors[ds] || COLORS.baseline);
      legend.append("text").attr("x", xOff + 14).attr("y", 0).attr("font-size", 10).text(ds);
      xOff += 70;
    });
  }

  window.charts = {
    renderVllmPipelineTps: renderVllmPipelineTps,
    renderStandaloneTpuVsGpu: renderStandaloneTpuVsGpu,
    renderAcceptanceAnalysis: renderAcceptanceAnalysis,
    renderAcceptanceGpuVsTpu: renderAcceptanceGpuVsTpu,
  };
})();
