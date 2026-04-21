/**
 * NEW YORK LLC — Homepage interactions
 * Loader, reveal animations, counter, nav scroll, cursor glow, tilt.
 */

(() => {
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

  /* ------------- Loader ------------- */
  const loader = $("#loader");
  const dots = $(".loader-dots");
  let dotCount = 0;
  const dotTimer = setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    if (dots) dots.textContent = ".".repeat(dotCount);
  }, 260);

  const hideLoader = () => {
    clearInterval(dotTimer);
    if (loader) loader.classList.add("hidden");
    setTimeout(() => {
      if (loader) loader.style.display = "none";
      revealHero();
    }, 900);
  };
  window.addEventListener("load", () => {
    setTimeout(hideLoader, 900);
  });

  /* ------------- Reveal observer ------------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
          if (entry.target.dataset.counter !== undefined) {
            startCounter(entry.target);
          }
          // trigger counters inside
          $$("[data-counter]", entry.target).forEach(startCounter);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
  );
  $$("[data-reveal], [data-reveal-stagger]").forEach((el) => revealObserver.observe(el));

  const revealHero = () => {
    $$(".hero [data-reveal], .hero [data-reveal-stagger]").forEach((el) =>
      el.classList.add("in"),
    );
    $$(".hero [data-counter]").forEach(startCounter);
  };

  /* ------------- Counter ------------- */
  const countedSet = new WeakSet();
  function startCounter(el) {
    if (countedSet.has(el)) return;
    countedSet.add(el);
    const target = parseFloat(el.dataset.counter);
    if (!Number.isFinite(target)) return;
    const hasDecimal = el.dataset.counter.includes(".");
    const duration = 1400;
    const start = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const val = target * easeOut(t);
      el.textContent = hasDecimal ? val.toFixed(1) : Math.round(val).toString();
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = hasDecimal ? target.toFixed(1) : Math.round(target).toString();
    };
    requestAnimationFrame(step);
  }

  /* ------------- Split text on hero words ------------- */
  // already pre-split in HTML; just ensure the class works on resize: nothing needed here

  /* ------------- Nav scroll ------------- */
  const nav = $("#nav");
  const onScroll = () => {
    if (!nav) return;
    if (window.scrollY > 24) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ------------- Smooth scroll for in-page anchors ------------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = a.getAttribute("href");
      if (!target || target === "#") return;
      const el = document.querySelector(target);
      if (!el) return;
      e.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  /* ------------- Cursor glow (desktop only) ------------- */
  const cursorGlow = $("#cursorGlow");
  const canHover = window.matchMedia("(hover: hover)").matches;
  if (cursorGlow && canHover) {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    window.addEventListener(
      "mousemove",
      (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
        cursorGlow.classList.add("active");
      },
      { passive: true },
    );
    window.addEventListener("mouseleave", () => cursorGlow.classList.remove("active"));

    const tick = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      cursorGlow.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    tick();
  }

  /* ------------- Tilt effect on tech cards ------------- */
  if (canHover) {
    $$("[data-tilt]").forEach((card) => {
      let raf = null;
      const onMove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rx = ((y / rect.height) - 0.5) * -8;
        const ry = ((x / rect.width) - 0.5) * 8;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.transform = `translateY(-6px) perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        });
      };
      const onLeave = () => {
        if (raf) cancelAnimationFrame(raf);
        card.style.transform = "";
      };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
    });
  }

  /* ------------- Parallax hero visual ------------- */
  const heroVisual = $(".hero-visual");
  if (heroVisual) {
    let parallaxY = 0;
    const updateParallax = () => {
      const scroll = window.scrollY;
      parallaxY = Math.min(scroll * 0.15, 120);
      heroVisual.style.transform = `translateY(${parallaxY}px)`;
    };
    window.addEventListener("scroll", updateParallax, { passive: true });
  }
})();
