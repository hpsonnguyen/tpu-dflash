/** scrollTrigger.js - IntersectionObserver helpers */

function onScrollIntoView(selector, callback) {
  const el = document.querySelector(selector);
  if (!el) return;
  let done = false;
  const observer = new IntersectionObserver(
    (entries) => {
      if (done) return;
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        done = true;
        observer.disconnect();
        callback();
      }
    },
    { rootMargin: "100px", threshold: 0.1 }
  );
  observer.observe(el);
}

function initFadeOnScroll() {
  var containers = document.querySelectorAll("main .container");
  if (!containers.length) return;

  var targets = [];
  containers.forEach(function (c) {
    var children = c.children;
    for (var i = 0; i < children.length; i++) {
      targets.push(children[i]);
    }
  });

  if (!targets.length) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        } else {
          entry.target.classList.remove("visible");
        }
      });
    },
    { rootMargin: "0px 0px -30px 0px", threshold: 0.01 }
  );

  targets.forEach(function (el, idx) {
    el.classList.add("fade-section");
    el.style.transitionDelay = (idx % 4) * 0.06 + "s";
    observer.observe(el);
  });
}

var _chartVisibilityCallbacks = [];

function onChartVisible(callback) {
  _chartVisibilityCallbacks.push(callback);
}

function initChartReplay() {
  var chartEls = document.querySelectorAll(".chart-container");
  if (!chartEls.length) return;

  // State per chart: "init" → "seen" → "left" → "replay-eligible"
  // Only replay when transitioning from "left" back to visible.
  var state = {};

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        var id = entry.target.id;
        if (!id) return;

        if (entry.isIntersecting) {
          if (!state[id]) {
            // First fire after observe() — chart already rendered, skip
            state[id] = "seen";
            return;
          }
          if (state[id] === "left") {
            // Re-entered viewport after being away — replay animation
            state[id] = "seen";
            requestAnimationFrame(function () {
              _chartVisibilityCallbacks.forEach(function (cb) {
                cb(entry.target);
              });
            });
          }
        } else {
          // Left viewport — next entry will trigger replay
          if (state[id] === "seen") {
            state[id] = "left";
          } else if (!state[id]) {
            // Was never visible (e.g. carousel hidden slide) — mark so first real show skips
            state[id] = "left";
          }
        }
      });
    },
    { rootMargin: "0px", threshold: 0.15 }
  );

  chartEls.forEach(function (el) { observer.observe(el); });
}

window.scrollTrigger = {
  onScrollIntoView: onScrollIntoView,
  initFadeOnScroll: initFadeOnScroll,
  onChartVisible: onChartVisible,
  initChartReplay: initChartReplay
};
