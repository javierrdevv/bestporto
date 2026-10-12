/* =========================================================
   Rangga Aditama - Editorial Engineering
   GSAP + ScrollTrigger + Lenis. Motion is reduced/disabled
   when the user prefers reduced motion.
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Navigation (always active) ---------- */
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("site-menu");

  var navTime = document.getElementById("nav-time");
  if (navTime) {
    var tick = function () {
      var d = new Date();
      var h = d.getHours();
      var m = d.getMinutes();
      navTime.textContent = (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
    };
    tick();
    setInterval(tick, 30000);
  }

  function closeMenu() {
    if (!nav || !toggle) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
    if (menu) {
      menu.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", closeMenu);
      });
    }
  }

  /* Nav scroll state via IntersectionObserver (no scroll listener) */
  if (nav) {
    var sentinel = document.createElement("span");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;";
    document.body.prepend(sentinel);
    new IntersectionObserver(
      function (entries) {
        nav.classList.toggle("is-scrolled", !entries[0].isIntersecting);
      },
      { rootMargin: "0px" }
    ).observe(sentinel);
  }

  /* ---------- Loading screen ---------- */
  var loader = document.querySelector(".loader");
  var loaderFinished = false;

  function hideLoader() {
    if (!loader || loaderFinished) return;
    loaderFinished = true;
    loader.classList.add("is-done");
    root.classList.remove("is-loading");
    window.dispatchEvent(new Event("loader:done"));
    var cleanup = function () {
      if (loader.parentNode) loader.remove();
    };
    loader.addEventListener("transitionend", function (e) {
      if (e.propertyName === "opacity") cleanup();
    });
    setTimeout(cleanup, 1400);
  }

  if (loader) {
    root.classList.add("is-loading");
    var loadStart = Date.now();
    var minShow = reduce ? 250 : 1100;
    var onLoad = function () {
      setTimeout(hideLoader, Math.max(0, minShow - (Date.now() - loadStart)));
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    setTimeout(hideLoader, 5000);
  }

  /* If GSAP did not load, drop the JS-gated hiding so content stays visible. */
  if (typeof gsap === "undefined") {
    root.classList.remove("js");
    return;
  }

  if (typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ---------- Smooth scroll (Lenis) ---------- */
  var lenis = null;
  if (!reduce && typeof Lenis !== "undefined" && typeof ScrollTrigger !== "undefined") {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        var target = id === "#top" ? null : document.querySelector(id);
        if (id === "#top") {
          e.preventDefault();
          lenis.scrollTo(0);
        } else if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -70 });
        }
      });
    });
  }

  if (reduce) return;

  /* ---------- Hero intro ---------- */
  /* y:0 clears the residual px offset GSAP parses from the CSS translateY(112%). */
  gsap.set(".hero__title .line__inner", { yPercent: 112, y: 0 });
  gsap.set(".hero__sub", { opacity: 0, y: 16 });
  gsap.set(".hero__cta", { opacity: 0, y: 16 });
  /* Image rests zoomed-in at the top; load settles it with a soft zoom-in. */
  gsap.set(".hero__media img", { opacity: 0, scale: 1.6 });

  function startIntro() {
    var intro = gsap.timeline({ defaults: { ease: "expo.out" } });
    intro
      .to(".hero__title .line__inner", { yPercent: 0, duration: 1.15, stagger: 0.09 })
      .to(".hero__media img", { opacity: 1, scale: 1.5, duration: 1.6, ease: "power3.out" }, 0.1)
      .to(".hero__sub", { opacity: 1, y: 0, duration: 0.8 }, "-=0.95")
      .to(".hero__cta", { opacity: 1, y: 0, duration: 0.8 }, "-=0.65");
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  }

  /* Play the intro only once the loader has left, so it is never hidden behind it. */
  if (loader && !loaderFinished) {
    window.addEventListener("loader:done", startIntro, { once: true });
  } else {
    startIntro();
  }

  /* ---------- Section reveals ---------- */
  if (typeof ScrollTrigger !== "undefined") {
    gsap.utils.toArray(".reveal").forEach(function (el) {
      gsap.fromTo(
        el,
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }
      );
    });

    /* Hero image-zoom: pin the hero and zoom the photo OUT on scroll.
       The page only continues after the zoom-out finishes. */
    gsap.fromTo(
      ".hero__media img",
      { scale: 1.5 },
      {
        scale: 1,
        ease: "none",
        immediateRender: false,
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "+=110%",
          pin: true,
          scrub: 0.6,
        },
      }
    );

    /* Recalculate once fonts and above-fold assets settle. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        ScrollTrigger.refresh();
      });
    }
  }
})();
