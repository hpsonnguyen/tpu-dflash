/** replay.js - Render replay cards from samples */

var METHOD_ORDER = ["baseline", "dflash_gpu", "dflash_tpu", "eagle3"];

function renderSingleCard(sample, samples, selectedIdx, onDatasetChange) {
  var methods = sample.methods || {};
  var rowsHtml = METHOD_ORDER
    .filter(function (key) { return methods[key]; })
    .map(function (name) {
      var data = methods[name];
      var tps = typeof data.tokens_per_second === "number"
        ? data.tokens_per_second.toFixed(1)
        : (data.tokens_per_second || "NA");
      var tokenCount = data.output_token_count != null ? data.output_token_count : "-";
      var al = data.acceptance_lengths;
      var hasDrafts = al && al.length > 0;
      var draftCount = hasDrafts ? al.length : null;
      var statsLabel = draftCount != null
        ? tokenCount + ' tokens · <span class="draft-counter">0</span> / ' + draftCount + " drafts"
        : tokenCount + " tokens · no drafting";
      var totalAccepted = hasDrafts ? al.reduce(function (a, b) { return a + b; }, 0) : 0;
      var draftSegmentsHtml = "";
      if (hasDrafts && totalAccepted > 0) {
        draftSegmentsHtml = '<div class="method-draft-segments method-draft-segments-hidden">' +
          al.map(function (n, idx) {
            return '<span class="draft-seg" style="flex:' + n + '" data-draft="' + (idx + 1) + '" data-accepted="' + n + '"></span>';
          }).join("") +
          "</div>";
      }
      return (
        '<div class="method-row" data-method="' + name + '">' +
        '<div class="method-row-header">' +
        '<span class="method-title">' + name + '</span>' +
        '<span class="method-meta">' + tps + " TPS</span>" +
        "</div>" +
        '<div class="method-output" style="word-wrap:break-word;overflow-wrap:break-word;">' + (data.output_text || "") + "</div>" +
        '<div class="method-progress-wrap">' +
        '<div class="method-progress-area">' +
        '<div class="method-progress-bar"><div class="method-progress-fill"></div></div>' +
        draftSegmentsHtml +
        "</div>" +
        '<span class="method-progress-stats">' + statsLabel + "</span>" +
        "</div>" +
        "</div>"
      );
    })
    .join("");
  var selectHtml = "";
  if (samples && samples.length > 1 && onDatasetChange) {
    var opts = samples.map(function (s, i) {
      return '<option value="' + i + '"' + (i === selectedIdx ? ' selected' : '') + '>' + s.dataset + "</option>";
    }).join("");
    selectHtml = '<select class="replay-dataset-select" aria-label="Dataset">' + opts + "</select>";
  } else {
    selectHtml = '<span class="replay-dataset-label">' + sample.dataset + "</span>";
  }
  return (
    '<div class="replay-card">' +
    '<div class="replay-header">' +
    '<div class="replay-header-left">' + selectHtml + '</div>' +
    '<button type="button" class="replay-play-btn">Play</button>' +
    "</div>" +
    '<div class="method-meta replay-prompt">Prompt: ' + (sample.prompt || "") + "</div>" +
    '<div class="replay-rows">' + rowsHtml + "</div>" +
    "</div>"
  );
}

function typewriterAnimate(element, text, tps, onComplete, opts) {
  opts = opts || {};
  var progressFillEl = opts.progressFillEl;
  var draftCounterEl = opts.draftCounterEl;
  var acceptanceLengths = opts.acceptanceLengths;
  var totalTokens = opts.totalTokens;

  var methodRowEl = opts.methodRowEl;

  if (!element || text === "") {
    if (progressFillEl) progressFillEl.style.width = "100%";
    if (draftCounterEl && acceptanceLengths) draftCounterEl.textContent = acceptanceLengths.length;
    if (methodRowEl) showDraftChunks(methodRowEl, acceptanceLengths.length);
    if (onComplete) onComplete();
    return;
  }
  var tpsNum = typeof tps === "number" && tps > 0 ? tps : 100;
  var len = text.length;
  var totalTokens = opts.totalTokens;
  var scale = 2.5;
  var durationMs;
  if (totalTokens && totalTokens > 0) {
    durationMs = (totalTokens / tpsNum) * 1000 * scale;
  } else {
    durationMs = (len / 4 / tpsNum) * 1000 * scale;
  }
  durationMs = Math.max(350, Math.min(10000, durationMs));
  var intervalMs = durationMs / len;
  var i = 0;

  var cumsum = [];
  if (acceptanceLengths && totalTokens && totalTokens > 0) {
    var s = 0;
    for (var k = 0; k < acceptanceLengths.length; k++) {
      s += acceptanceLengths[k];
      cumsum.push(s);
    }
    var totalAccepted = s;
    if (totalAccepted > 0 && totalAccepted !== totalTokens) {
      var scale = totalTokens / totalAccepted;
      for (var m = 0; m < cumsum.length; m++) {
        cumsum[m] = cumsum[m] * scale;
      }
    }
  }

  element.textContent = "";
  if (progressFillEl) progressFillEl.style.width = "0%";
  if (draftCounterEl) draftCounterEl.textContent = "0";
  if (methodRowEl) showDraftChunks(methodRowEl, 0);

  var id = setInterval(function () {
    if (i >= len) {
      clearInterval(id);
      if (progressFillEl) progressFillEl.style.width = "100%";
      if (draftCounterEl && acceptanceLengths) draftCounterEl.textContent = acceptanceLengths.length;
      if (methodRowEl && acceptanceLengths) showDraftChunks(methodRowEl, acceptanceLengths.length);
      if (onComplete) onComplete();
      return;
    }
    element.textContent = text.slice(0, i + 1);
    var progress = (i + 1) / len;
    if (progressFillEl) progressFillEl.style.width = (progress * 100) + "%";

    if ((draftCounterEl || methodRowEl) && cumsum.length > 0 && totalTokens > 0) {
      var currentTokens = progress * totalTokens;
      var d = 0;
      for (var j = 0; j < cumsum.length; j++) {
        if (currentTokens >= cumsum[j]) d = j + 1;
        else break;
      }
      if (draftCounterEl) draftCounterEl.textContent = d;
      if (methodRowEl) showDraftChunks(methodRowEl, d);
    }

    i += 1;
  }, intervalMs);
}

function showDraftChunks(methodRowEl, count) {
  var segs = methodRowEl.querySelectorAll(".draft-seg");
  for (var s = 0; s < segs.length; s++) {
    if (s < count) segs[s].classList.add("draft-seg-visible");
    else segs[s].classList.remove("draft-seg-visible");
  }
}

function playSampleReplay(cardEl, sample) {
  var methods = sample.methods || {};
  var ordered = METHOD_ORDER.filter(function (k) { return methods[k]; });
  var methodRows = cardEl.querySelectorAll(".method-row");
  var completed = 0;
  var total = ordered.length;
  function checkDone() {
    completed += 1;
    if (completed >= total) {
      var btn = cardEl.querySelector(".replay-play-btn");
      if (btn) {
        btn.textContent = "Replay";
        btn.disabled = false;
      }
    }
  }
  ordered.forEach(function (key, idx) {
    var methodEl = methodRows[idx];
    if (!methodEl) return;
    var data = methods[key];
    var outputEl = methodEl.querySelector(".method-output");
    var progressFillEl = methodEl.querySelector(".method-progress-fill");
    var draftCounterEl = methodEl.querySelector(".draft-counter");
    if (!outputEl) return;
    if (progressFillEl) progressFillEl.style.width = "0%";
    if (draftCounterEl) draftCounterEl.textContent = "0";
    var text = data.output_text || "";
    var tps = data.tokens_per_second;
    var opts = {
      progressFillEl: progressFillEl,
      draftCounterEl: draftCounterEl,
      acceptanceLengths: data.acceptance_lengths || null,
      totalTokens: data.output_token_count || null,
      methodRowEl: methodEl
    };
    typewriterAnimate(outputEl, text, tps, checkDone, opts);
  });
}

function wirePlayButton(cardEl, sample) {
  var btn = cardEl.querySelector(".replay-play-btn");
  if (!btn) return;
  btn.addEventListener("click", function () {
    btn.disabled = true;
    btn.textContent = "Playing…";
    cardEl.classList.add("replay-playing");
    cardEl.querySelectorAll(".method-output").forEach(function (el) { el.textContent = ""; });
    cardEl.querySelectorAll(".method-progress-fill").forEach(function (el) { el.style.width = "0%"; });
    cardEl.querySelectorAll(".draft-counter").forEach(function (el) { el.textContent = "0"; });
    cardEl.querySelectorAll(".method-row").forEach(function (row) {
      row.querySelectorAll(".draft-seg").forEach(function (seg) { seg.classList.remove("draft-seg-visible"); });
    });
    playSampleReplay(cardEl, sample);
  });
}

function renderReplays(container, samples) {
  if (!container) return;
  if (!samples || samples.length === 0) {
    container.innerHTML = "<p>No replay samples available.</p>";
    return;
  }

  var selectedIdx = 0;

  function showSample(idx) {
    selectedIdx = Math.max(0, Math.min(idx, samples.length - 1));
    var sample = samples[selectedIdx];
    if (!sample) return;
    var cardContainer = container.querySelector(".replay-card-container");
    if (cardContainer) {
      cardContainer.innerHTML = renderSingleCard(sample, samples, selectedIdx, true);
      var cardEl = cardContainer.querySelector(".replay-card");
      if (cardEl) {
        wirePlayButton(cardEl, sample);
        var selectEl = cardEl.querySelector(".replay-dataset-select");
        if (selectEl) {
          selectEl.addEventListener("change", function () {
            showSample(parseInt(selectEl.value, 10));
          });
        }
      }
    }
  }

  container.innerHTML = '<div class="replay-card-container">' + renderSingleCard(samples[0], samples, 0, samples.length > 1) + "</div>";

  var cardEl = container.querySelector(".replay-card");
  if (cardEl) {
    wirePlayButton(cardEl, samples[0]);
    var selectEl = cardEl.querySelector(".replay-dataset-select");
    if (selectEl) {
      selectEl.addEventListener("change", function () {
        showSample(parseInt(selectEl.value, 10));
      });
    }
  }
}

window.replay = { renderReplays };
