/** scrollTrigger.js - IntersectionObserver; on intersect invoke callback once */

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

window.scrollTrigger = { onScrollIntoView };
