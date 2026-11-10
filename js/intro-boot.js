/* Opt in before the first paint. Without JavaScript, the portfolio stays visible. */
(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.location.hash) return;

    root.classList.add('intro-pending');
    const intro = window.portfolioIntro = {
        finish() { root.classList.remove('intro-pending'); }
    };
    // A single safety deadline, not an animation timer: failed scripts/fonts must
    // never strand the page in its prepaint state. The master timeline owns timing.
    intro.safetyDeadline = window.setTimeout(() => intro.finish(), 8000);
})();
