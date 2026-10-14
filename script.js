/* =========================================================
   Haidar Nanda - Editorial Engineering
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

  /* ---------- Theme toggle ---------- */
  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    var syncTheme = function (t) {
      themeBtn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
      themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
      var paper = t === "dark" ? "#17150f" : "#f1eee6";
      document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
        m.setAttribute("content", paper);
      });
    };
    var theme = root.getAttribute("data-theme") || "light";
    syncTheme(theme);
    themeBtn.addEventListener("click", function () {
      theme = theme === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", theme);
      syncTheme(theme);
      try { localStorage.setItem("theme", theme); } catch (e) {}
    });
  }

  var toggleLabel = toggle && toggle.querySelector(".nav__toggle-label");

  function setMenu(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    root.classList.toggle("menu-lock", open);
    if (toggleLabel) toggleLabel.textContent = open ? "Close" : "Menu";
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenu(!nav.classList.contains("is-open"));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
    if (menu) {
      menu.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () { setMenu(false); });
      });
    }
    var desktop = window.matchMedia("(min-width: 721px)");
    var onDesktop = function (e) { if (e.matches) setMenu(false); };
    if (desktop.addEventListener) desktop.addEventListener("change", onDesktop);
    else if (desktop.addListener) desktop.addListener(onDesktop);
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

  /* ---------- Smart nav: hide on scroll down, reveal on scroll up + progress ---------- */
  if (nav && typeof ScrollTrigger !== "undefined") {
    var progressEl = nav.querySelector(".nav__progress");
    var lastNavY = 0;
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: function (self) {
        var y = self.scroll();
        if (progressEl) progressEl.style.transform = "scaleX(" + self.progress.toFixed(4) + ")";
        if (reduce || nav.classList.contains("is-open")) {
          nav.classList.remove("nav--hidden");
          lastNavY = y;
          return;
        }
        if (y > lastNavY + 4 && y > 160) nav.classList.add("nav--hidden");
        else if (y < lastNavY - 4) nav.classList.remove("nav--hidden");
        lastNavY = y;
      },
    });
  }

  /* ---------- Custom cursor (fine pointer + motion allowed only) ---------- */
  if (!reduce && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var cursor = document.createElement("div");
    cursor.className = "cursor is-hidden";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = '<span class="cursor__ring"></span><span class="cursor__dot"></span>';
    document.body.appendChild(cursor);
    root.classList.add("has-cursor");

    var cursorRing = cursor.querySelector(".cursor__ring");
    var cursorDot = cursor.querySelector(".cursor__dot");
    var mx = window.innerWidth / 2;
    var my = window.innerHeight / 2;
    var rx = mx;
    var ry = my;
    var cursorSeen = false;
    var cursorScale = 1;

    document.addEventListener("mousemove", function (e) {
      mx = e.clientX;
      my = e.clientY;
      if (!cursorSeen) {
        cursorSeen = true;
        rx = mx;
        ry = my;
      }
      cursor.classList.remove("is-hidden");
      cursorDot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
    });
    document.addEventListener("mouseleave", function () {
      cursor.classList.add("is-hidden");
    });
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest("a, button, [role='button']")) cursor.classList.add("is-active");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest("a, button, [role='button']")) cursor.classList.remove("is-active");
    });

    gsap.ticker.add(function () {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      var target = cursor.classList.contains("is-active") ? 1.9 : 1;
      cursorScale += (target - cursorScale) * 0.18;
      cursorRing.style.transform =
        "translate3d(" + rx + "px," + ry + "px,0) scale(" + cursorScale.toFixed(3) + ")";
    });
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
    /* Hero image-zoom: pin the hero and zoom the photo OUT on scroll.
       Created first so every later scroll trigger measures with its
       pin-spacer already in the layout; otherwise their starts read
       ~110vh too early. */
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

    /* Selected work: each case study unfolds.
       The media curtain opens (clip-path), the frame settles from a slight
       over-scale, the caption rises in sequence, then the media drifts with
       the scroll. All of it is GSAP-owned on the frame, so the photo's CSS
       hover zoom stays intact. */
    gsap.utils.toArray(".project").forEach(function (el) {
      var media = el.querySelector(".project__media");
      var caption = el.querySelectorAll(
        ".project__index, .project__title, .project__meta, .project__desc"
      );

      var tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 82%", once: true },
        defaults: { ease: "expo.out" },
      });

      if (media) {
        gsap.set(media, { clipPath: "inset(0 100% 0 0)" });
        tl.to(media, { clipPath: "inset(0 0% 0 0)", duration: 1.1 }, 0);
        tl.fromTo(media, { scale: 1.05 }, { scale: 1, duration: 1.3, ease: "power3.out" }, 0);
      }
      if (caption.length) {
        tl.fromTo(
          caption,
          { y: 34, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.07 },
          0.2
        );
      }

      /* Continuous depth: the media block drifts against the scroll. */
      if (media) {
        gsap.fromTo(
          media,
          { yPercent: 4 },
          {
            yPercent: -4,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          }
        );
      }
    });

    /* Sticky stack: each case study pins and the next slides over it, while
       the outgoing panel recedes. Created after the hero pin so positions
       account for its pin-spacer. Desktop only; small screens and reduced
       motion keep a plain scrolling list. */
    if (window.matchMedia("(min-width: 901px)").matches) {
      var panels = gsap.utils.toArray(".project");
      panels.forEach(function (panel, i) {
        if (i === panels.length - 1) return;
        gsap.to(panel, {
          scale: 0.9,
          opacity: 0.6,
          ease: "none",
          scrollTrigger: {
            trigger: panels[i + 1],
            start: "top bottom",
            end: "top top",
            scrub: true,
          },
        });
      });
    }

    /* Recalculate once fonts and above-fold assets settle. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        ScrollTrigger.refresh();
      });
    }
  }
})();
