/* OZFIRSTCHOICE — site behaviour (menu, counters, animations, contact form) */
(function () {
  document.documentElement.classList.remove("no-js");

  // Mobile menu
  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Header shadow on scroll
  var header = document.querySelector(".site-header");
  function onScroll() { if (header) header.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Footer year
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Count-up stats: <span class="count" data-target="60">60</span>
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-target")) || 0;
    if (reduceMotion) { el.textContent = target; return; }
    var start = null, duration = 1600;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target.classList.contains("count")) countUp(e.target);
        else e.target.classList.add("in");
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(".reveal, .count").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  // Legal sidebar smooth scroll (privacy policy "On this page")
  document.querySelectorAll(".legal-nav a[href^='#']").forEach(function (a) {
    a.addEventListener("click", function (ev) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      ev.preventDefault();
      var top = target.getBoundingClientRect().top + window.pageYOffset - 96;
      window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });

  // Card carousels: grouped slides (Bootstrap-style, no dependency)
  function initCarousel(id, sel, delay) {
    var carousel = document.getElementById(id);
    if (!carousel) return;
    var track = carousel.querySelector(sel.track);
    var slides = Array.prototype.slice.call(track.querySelectorAll(sel.slide));
    var dots = Array.prototype.slice.call(carousel.querySelectorAll(sel.dot));
    var prev = carousel.querySelector(sel.prev);
    var next = carousel.querySelector(sel.next);
    var idx = 0, timer = null;
    function mobile() { return window.innerWidth <= 700; }
    function go(i) {
      idx = (i + slides.length) % slides.length;
      track.style.transform = mobile() ? "" : "translateX(-" + idx * 100 + "%)";
      dots.forEach(function (d, k) {
        d.classList.toggle("active", k === idx);
        d.setAttribute("aria-selected", k === idx ? "true" : "false");
      });
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() {
      stop();
      if (reduceMotion || mobile() || document.hidden) return;
      timer = setInterval(function () { go(idx + 1); }, delay || 6000);
    }
    if (prev) prev.addEventListener("click", function () { go(idx - 1); start(); });
    if (next) next.addEventListener("click", function () { go(idx + 1); start(); });
    dots.forEach(function (d) {
      d.addEventListener("click", function () { go(parseInt(d.getAttribute("data-slide"), 10) || 0); start(); });
    });
    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", start);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    var sx = 0;
    track.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; stop(); }, { passive: true });
    track.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
      start();
    }, { passive: true });
    window.addEventListener("resize", function () { go(idx); start(); });
    go(0); start();
  }
  initCarousel("services-carousel", { track: ".svc-track", slide: ".svc-slide", dot: ".svc-dot", prev: ".svc-prev", next: ".svc-next" });


  // Anchor scroll with sticky-header offset (same-page + direct hash links)
  function scrollToHash(hash) {
    if (!hash || hash === "#") return false;
    var target;
    try { target = document.querySelector(hash); } catch (e) { return false; }
    if (!target) return false;
    var prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    if (target.scrollIntoView) { try { target.scrollIntoView({ block: "start", behavior: "auto" }); } catch (e) { target.scrollIntoView(true); } }
    var top = target.getBoundingClientRect().top + window.pageYOffset - 96;
    window.scrollTo(0, top);
    document.documentElement.style.scrollBehavior = prev;
    return true;
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    if (a.closest(".legal-nav")) return;
    a.addEventListener("click", function (ev) {
      var hash = a.getAttribute("href");
      if (hash.length > 1 && document.querySelector(hash)) {
        ev.preventDefault();
        var top = document.querySelector(hash).getBoundingClientRect().top + window.pageYOffset - 96;
        window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  });
  if (location.hash) {
    var startHash = location.hash;
    var cleaned = false;
    // Scroll to the section, then clean the # from the address bar
    var fixHash = function () {
      if (scrollToHash(startHash)) {
        if (!cleaned) { cleaned = true; history.replaceState(null, "", location.pathname); }
      }
    };
    window.addEventListener("load", function () { setTimeout(fixHash, 60); setTimeout(fixHash, 600); });
    window.addEventListener("pageshow", function () { setTimeout(fixHash, 60); });
    setTimeout(fixHash, 350);
    setTimeout(fixHash, 1200);
  }

  // Contact form (Web3Forms) — shows an on-page thank-you message
  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var status = form.querySelector(".form-status");
      var btn = form.querySelector("button[type=submit]");
      status.className = "form-status";
      status.textContent = "";

      if (form.querySelector("[name=botcheck]").checked) return; // spam bot

      var key = form.querySelector("[name=access_key]").value;
      if (!key || key.indexOf("YOUR_") === 0) {
        status.className = "form-status error";
        status.textContent = "The form isn't connected yet. Please call or email us directly.";
        return;
      }

      btn.disabled = true;
      var label = btn.innerHTML;
      btn.textContent = "Sending…";

      fetch(form.action, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new FormData(form)
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success) {
            form.hidden = true;
            document.getElementById("form-success").hidden = false;
            document.getElementById("form-success").focus();
          } else {
            throw new Error(data.message || "Error");
          }
        })
        .catch(function () {
          status.className = "form-status error";
          status.textContent = "Sorry, something went wrong. Please try again or call 03 8015 8978.";
        })
        .finally(function () { btn.disabled = false; btn.innerHTML = label; });
    });
  }
})();
