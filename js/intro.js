/* One measured shared-logo transition and one master entrance timeline. */
(() => {
    const root = document.documentElement;
    const intro = window.portfolioIntro;
    if (!intro) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listeners = new AbortController();
    const savedStyles = new Map();
    const targets = [];
    let timeline;
    let layer;
    let finished = false;
    let logoDocked = false;
    let measureLogo;
    let resizeFrame;
    const mobileNavigation = window.matchMedia('(max-width: 900px)');
    const initialMobileNavigation = mobileNavigation.matches;

    function remember(element, properties = ['opacity', 'visibility', 'transform', 'transform-origin', 'translate', 'rotate', 'scale']) {
        if (!element || savedStyles.has(element)) return;
        savedStyles.set(element, {
            hadStyle: element.hasAttribute('style'),
            properties: properties.map(property => ({
                property, value: element.style.getPropertyValue(property),
                priority: element.style.getPropertyPriority(property)
            }))
        });
    }

    // Completion, interruption, failure and BFCache all restore the original DOM.
    function finish() {
        if (finished) return;
        finished = true;
        window.clearTimeout(intro.safetyDeadline);
        window.cancelAnimationFrame(resizeFrame);
        timeline?.kill();
        listeners.abort();
        layer?.remove();
        savedStyles.forEach(({ hadStyle, properties }, element) => {
            properties.forEach(({ property, value, priority }) => {
                if (value) element.style.setProperty(property, value, priority);
                else element.style.removeProperty(property);
            });
            if (!hadStyle && !element.style.length) element.removeAttribute('style');
        });
        targets.forEach(element => element.removeAttribute('data-intro-item'));
        root.classList.remove('intro-pending');
        delete intro.timeline;
    }
    intro.finish = finish;

    // Never delay a visitor who starts using the page. No focus trap or scroll lock.
    ['keydown', 'pointerdown', 'focusin', 'wheel', 'touchstart'].forEach(type => {
        document.addEventListener(type, finish, { capture: true, passive: true, signal: listeners.signal });
    });
    window.addEventListener('scroll', finish, { passive: true, signal: listeners.signal });
    window.addEventListener('pagehide', finish, { signal: listeners.signal });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) finish();
    }, { signal: listeners.signal });
    motionPreference.addEventListener('change', event => {
        if (event.matches) finish();
    }, { signal: listeners.signal });
    window.addEventListener('resize', () => {
        window.cancelAnimationFrame(resizeFrame);
        resizeFrame = window.requestAnimationFrame(() => {
            // A breakpoint can change the caption and menu as well as coordinates.
            // Before docking, remeasure the layer without restarting its clock.
            if (logoDocked || mobileNavigation.matches !== initialMobileNavigation) finish();
            else {
                try { measureLogo?.(); } catch { finish(); }
            }
        });
    }, { passive: true, signal: listeners.signal });

    function inViewport(element) {
        if (!element || element.closest('[hidden], .hidden')) return false;
        const bounds = element.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.right > 0
            && bounds.top < window.innerHeight && bounds.left < window.innerWidth;
    }

    // Copy resolved typography and mobile caption layout, including rules scoped
    // to .navbar .nav-logo, into an aria-hidden, pointer-transparent fixed layer.
    function copyLogoAppearance(original, copy) {
        const originalNodes = [original, ...original.querySelectorAll('*')];
        const copyNodes = [copy, ...copy.querySelectorAll('*')];
        originalNodes.forEach((node, index) => {
            const computed = window.getComputedStyle(node);
            const style = copyNodes[index].style;
            style.cssText = '';
            for (const property of computed) {
                if (!['visibility', 'opacity', 'transform', 'translate', 'scale', 'rotate', 'will-change'].includes(property)) {
                    style.setProperty(property, computed.getPropertyValue(property));
                }
            }
            style.transition = 'none';
            style.animation = 'none';
        });
    }

    async function start() {
        try {
            const gsap = window.gsap;
            const logo = document.querySelector('#navbar .nav-logo');
            const navbar = document.getElementById('navbar');
            if (!root.classList.contains('intro-pending') || !gsap || !logo || !navbar
                || motionPreference.matches || window.location.hash || window.scrollY > 2 || document.hidden) {
                finish();
                return;
            }

            // The logo is currently text, but decoding also supports a future image
            // inside the same component. All measurements happen after font layout.
            await Promise.all([
                document.fonts?.ready,
                ...Array.from(logo.querySelectorAll('img'), image => image.decode?.().catch(() => {}))
            ]);
            if (finished) return;

            const navMenu = document.getElementById('nav-menu');
            const desktopMenu = !mobileNavigation.matches;
            const navigation = [
                ...(desktopMenu ? document.querySelectorAll('#nav-menu .nav-link') : []),
                ...document.querySelectorAll('.nav-actions > *')
            ].filter(inViewport);
            const hero = Array.from(document.querySelectorAll([
                '.hero-greeting', '.hero-name', '.hero-description',
                '.hero-buttons > *', '.hero-socials > *', '.hero-proof'
            ].join(','))).filter(inViewport);
            const remaining = Array.from(document.querySelectorAll([
                '.hero-topline > span', '.retro-ribbon',
                '#main > section:not(#home) .section-tag',
                '#main > section:not(#home) .section-title',
                '#main > section:not(#home) .section-subtitle', '.proof-intro',
                '.highlight-card', '.project-filters > *', '.project-card',
                '.agency-card', '.about-portrait', '.about-text', '.about-card',
                '.skill-group', '.learning-details', '.contact-info', '.contact-form-wrapper',
                '.footer-main > *', '.footer-bottom > *'
            ].join(','))).filter(inViewport);
            // Avoid nested entrance transforms if a future visible card contains
            // another candidate. Existing offscreen scroll effects remain separate.
            const candidates = [...new Set([...navigation, ...hero, ...remaining])];
            targets.push(...candidates.filter(element => !candidates.some(parent => parent !== element && parent.contains(element))));
            const targetSet = new Set(targets);

            remember(logo, ['visibility']);
            remember(navbar, ['visibility']);
            if (desktopMenu && navMenu) remember(navMenu, ['opacity']);
            targets.forEach(element => {
                remember(element);
                element.setAttribute('data-intro-item', '');
            });

            layer = logo.cloneNode(true);
            layer.removeAttribute('href');
            layer.removeAttribute('id');
            layer.removeAttribute('aria-label');
            layer.setAttribute('aria-hidden', 'true');
            layer.setAttribute('tabindex', '-1');
            layer.setAttribute('data-intro-logo', '');
            layer.inert = true;
            layer.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
            document.body.append(layer);

            const pose = { entrance: 0.88, opacity: 0, travel: 0 };
            let geometry;
            function renderLogo() {
                if (!geometry || logoDocked || finished) return;
                const { destination, scale, x, y } = geometry;
                const progress = pose.travel;
                const currentScale = (scale + (1 - scale) * progress) * pose.entrance;
                // Compensate entrance scale around the center, while travel uses
                // a top-left origin so the last pixel matches the measured target.
                const insetX = destination.width * (scale * (1 - pose.entrance)) / 2 * (1 - progress);
                const insetY = destination.height * (scale * (1 - pose.entrance)) / 2 * (1 - progress);
                layer.style.transform = `translate3d(${x + (destination.left - x) * progress + insetX}px, ${y + (destination.top - y) * progress + insetY}px, 0) scale(${currentScale})`;
                layer.style.opacity = String(pose.opacity);
            }
            measureLogo = () => {
                const destination = logo.getBoundingClientRect();
                if (!destination.width || !destination.height) throw new Error('Logo has no layout bounds');
                copyLogoAppearance(logo, layer);
                Object.assign(layer.style, {
                    position: 'fixed', inset: 'auto', top: '0px', left: '0px', margin: '0px',
                    width: `${destination.width}px`, height: `${destination.height}px`, maxWidth: 'none',
                    visibility: 'visible', pointerEvents: 'none', zIndex: '150',
                    transformOrigin: '0 0', willChange: 'transform, opacity'
                });
                const scale = Math.min(2.3, window.innerWidth * 0.7 / destination.width, window.innerHeight * 0.25 / destination.height);
                geometry = {
                    destination, scale,
                    x: (window.innerWidth - destination.width * scale) / 2,
                    y: (window.innerHeight - destination.height * scale) / 2
                };
                renderLogo();
            };
            measureLogo();

            // These states are applied while the prepaint visibility gate is still
            // closed. CSS transitions are disabled only on these temporary targets.
            gsap.set(logo, { visibility: 'hidden' });
            gsap.set(targets, { opacity: 0, visibility: 'hidden', y: 22, scale: 0.92, transformOrigin: '50% 50%' });
            timeline = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, onComplete: finish });
            intro.timeline = timeline;
            timeline.addLabel('center', 0)
                .to(pose, { entrance: 1, opacity: 1, duration: 0.45, onUpdate: renderLogo }, 'center')
                .addLabel('travel', 0.85)
                .to(pose, { travel: 1, duration: 1.1, ease: 'power3.inOut', onUpdate: renderLogo }, 'travel')
                .call(() => {
                    logoDocked = true;
                    // A single render step hands off two identically styled boxes.
                    logo.style.visibility = 'visible';
                    layer.remove();
                }, [], 'travel+=1.1')
                .addLabel('navigation', 1.95)
                .set(navbar, { visibility: 'visible' }, 'navigation');
            if (desktopMenu && navMenu) {
                timeline.fromTo(navMenu, { opacity: 0 }, { opacity: 1, duration: 0.35 }, 'navigation');
            }

            function reveal(elements, startTime, stagger) {
                elements.filter(element => targetSet.has(element)).forEach((element, index) => {
                    const heading = element.matches('.hero-name, .section-title');
                    const visual = element.matches('.hero-proof, .highlight-card, .project-card');
                    const position = startTime + index * stagger;
                    // Explicit visibility is needed: autoAlpha's "inherit" would
                    // inherit the still-hidden container used to prevent flashing.
                    timeline.set(element, { visibility: 'visible' }, position).to(element, {
                        opacity: 1, y: 0, scale: 1,
                        duration: heading || visual ? 0.75 : 0.6,
                        ease: heading || visual ? 'back.out(1.05)' : 'back.out(1.25)'
                    }, position);
                });
            }
            reveal(navigation, 1.95, 0.08);
            const heroStart = 1.95 + Math.max(0, navigation.length - 1) * 0.08 + 0.1;
            timeline.addLabel('hero', heroStart);
            reveal(hero, heroStart, 0.11);
            const remainingStart = heroStart + Math.max(0, hero.length - 1) * 0.11 + 0.1;
            timeline.addLabel('details', remainingStart);
            reveal(remaining, remainingStart, 0.08);
            timeline.play(0);
        } catch (error) {
            finish();
            console.warn('Portfolio intro skipped:', error);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
