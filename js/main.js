/* Small, accessible enhancements. All portfolio content works without JavaScript. */
document.addEventListener('DOMContentLoaded', () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileLayout = window.matchMedia('(max-width: 900px)');
    const navbar = document.getElementById('navbar');
    const navMenu = document.getElementById('nav-menu');
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks = Array.from(document.querySelectorAll('.nav-link'));
    const sections = Array.from(document.querySelectorAll('#main section[id]'));
    function readingViewport() {
        return { top: 0, bottom: window.innerHeight, scrollTop: window.scrollY };
    }

    // Keep hidden mobile links out of the keyboard focus order.
    function setMenuOpen(open, restoreFocus = false) {
        if (!navMenu || !hamburger) return;
        const isOpen = Boolean(open && mobileLayout.matches);
        navMenu.classList.toggle('active', isOpen);
        hamburger.classList.toggle('active', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
        hamburger.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
        navMenu.inert = mobileLayout.matches && !isOpen;
        document.body.classList.toggle('menu-open', isOpen);
        if (restoreFocus) hamburger.focus();
    }

    if (navMenu && hamburger) {
        hamburger.setAttribute('aria-controls', navMenu.id);
        setMenuOpen(false);
        hamburger.addEventListener('click', () => {
            const open = hamburger.getAttribute('aria-expanded') !== 'true';
            setMenuOpen(open);
            if (open) navMenu.querySelector('a')?.focus();
        });
        navMenu.addEventListener('click', event => {
            if (event.target.closest('a')) setMenuOpen(false);
        });
        document.addEventListener('click', event => {
            if (!navMenu.contains(event.target) && !hamburger.contains(event.target)) {
                setMenuOpen(false);
            }
        });
        document.addEventListener('keydown', event => {
            if (hamburger.getAttribute('aria-expanded') !== 'true') return;
            if (event.key === 'Escape') {
                event.preventDefault();
                setMenuOpen(false, true);
            }
            if (event.key === 'Tab') {
                const focusable = [
                    ...navMenu.querySelectorAll('a[href], button:not([disabled])'),
                    ...document.querySelectorAll('.nav-actions a[href]'),
                    hamburger
                ];
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });
        mobileLayout.addEventListener('change', () => setMenuOpen(false));
    }

    // One passive scroll listener and one update per frame.
    let scrollPending = false;
    function updateNavigation() {
        const viewport = readingViewport();
        navbar?.classList.toggle('scrolled', viewport.scrollTop > 20);
        const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollRange > 0 ? Math.min(1, Math.max(0, viewport.scrollTop / scrollRange)) : 0;
        navbar?.style.setProperty('--reading-progress', progress.toFixed(4));
        const marker = Math.min(viewport.bottom - 24, viewport.top + (navbar?.offsetHeight || 80) + 48);
        let activeSection = sections[0];
        sections.forEach(section => {
            if (section.getBoundingClientRect().top <= marker) activeSection = section;
        });
        navLinks.forEach(link => {
            const active = link.getAttribute('href') === `#${activeSection?.id}`;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
        scrollPending = false;
    }
    function queueNavigationUpdate() {
        if (!scrollPending) {
            scrollPending = true;
            window.requestAnimationFrame(updateNavigation);
        }
    }
    window.addEventListener('scroll', queueNavigationUpdate, { passive: true });
    window.addEventListener('resize', updateNavigation);
    window.addEventListener('load', queueNavigationUpdate, { once: true });
    if ('ResizeObserver' in window) {
        new ResizeObserver(queueNavigationUpdate).observe(document.body);
    }
    updateNavigation();

    // Native anchor navigation keeps URL history and keyboard behavior intact.
    // CSS controls smooth scrolling and disables it for reduced-motion visitors.

    // Content starts visible; only offscreen elements receive a reveal state.
    if ('IntersectionObserver' in window && !reducedMotion.matches) {
        const revealItems = document.querySelectorAll([
            '.section-header', '.about-text', '.about-card', '.skill-group',
            '.project-card', '.highlight-card', '.agency-card',
            '.contact-info', '.contact-form-wrapper', '.learning-details'
        ].join(','));
        const revealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.remove('reveal-pending');
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '0px 0px 24px 0px' });
        const revealRows = new Map();
        revealItems.forEach(item => {
            const bounds = item.getBoundingClientRect();
            if (bounds.top > readingViewport().bottom) {
                const parent = item.parentElement;
                const rows = revealRows.get(parent) || [];
                let row = rows.find(candidate => Math.abs(candidate.top - bounds.top) < 12);
                if (!row) {
                    row = { top: bounds.top, count: 0 };
                    rows.push(row);
                    revealRows.set(parent, rows);
                }
                item.style.setProperty('--reveal-delay', `${Math.min(row.count * 70, 200)}ms`);
                row.count += 1;
                item.classList.add('scroll-reveal', 'reveal-pending');
                revealObserver.observe(item);
            }
        });
        // Keyboard navigation reveals the focused content without waiting for scrolling.
        document.addEventListener('focusin', event => {
            let item = event.target.closest('.reveal-pending');
            while (item) {
                revealObserver.unobserve(item);
                item.classList.remove('reveal-pending');
                item.classList.add('revealed');
                item.style.removeProperty('--reveal-delay');
                item = item.parentElement?.closest('.reveal-pending');
            }
        });
        function finishReveals() {
            revealObserver.disconnect();
            revealItems.forEach(item => {
                item.classList.remove('reveal-pending');
                item.style.removeProperty('--reveal-delay');
            });
        }
        reducedMotion.addEventListener('change', event => {
            if (event.matches) finishReveals();
        });
        window.addEventListener('pagehide', finishReveals, { once: true });
    }

    // Draw project diagrams once as they enter view; the artwork is visible by default.
    if ('IntersectionObserver' in window && !reducedMotion.matches) {
        const visuals = document.querySelectorAll('.project-card-visual');
        visuals.forEach(visual => {
            visual.querySelectorAll([
                '.health-visual svg > path:first-child',
                '.shield-visual svg > path:nth-child(-n+2)',
                '.chart-visual svg > path[stroke-width]',
                '.cafe-visual svg > path'
            ].join(',')).forEach(path => {
                path.setAttribute('pathLength', '1');
                path.classList.add('visual-trace');
            });
            visual.querySelectorAll('.chart-visual rect').forEach((bar, index) => {
                bar.style.setProperty('--bar-delay', `${index * 45}ms`);
            });
        });
        const visualObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('visual-entered');
                visualObserver.unobserve(entry.target);
            });
        }, { threshold: 0.2 });
        visuals.forEach(visual => visualObserver.observe(visual));
        function finishVisuals() {
            visualObserver.disconnect();
            visuals.forEach(visual => visual.classList.remove('visual-entered'));
        }
        reducedMotion.addEventListener('change', event => {
            if (event.matches) finishVisuals();
        });
        window.addEventListener('pagehide', finishVisuals, { once: true });
    }

    // Keep native disclosures intact and animate only the content on opening.
    const disclosureAnimations = new Map();
    document.querySelectorAll('.project-details, .achievement-details, .learning-details').forEach(details => {
        const content = details.querySelector('.project-details-content, .achievement-details-copy, .learning-content');
        if (!content || typeof content.animate !== 'function') return;
        details.addEventListener('toggle', () => {
            disclosureAnimations.get(details)?.cancel();
            disclosureAnimations.delete(details);
            if (!details.open || reducedMotion.matches) return;
            const animation = content.animate([
                { opacity: 0, transform: 'translateY(8px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
            disclosureAnimations.set(details, animation);
            const release = () => {
                if (disclosureAnimations.get(details) === animation) disclosureAnimations.delete(details);
            };
            animation.addEventListener('finish', release, { once: true });
            animation.addEventListener('cancel', release, { once: true });
        });
    });
    function cancelDisclosureAnimations() {
        disclosureAnimations.forEach(animation => animation.cancel());
        disclosureAnimations.clear();
    }
    reducedMotion.addEventListener('change', event => {
        if (event.matches) cancelDisclosureAnimations();
    });
    window.addEventListener('pagehide', cancelDisclosureAnimations);

    // Apply filters synchronously so quick clicks cannot leave stale cards hidden.
    const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
    const projectCards = Array.from(document.querySelectorAll('.project-card'));
    const showMoreButton = document.getElementById('project-show-more');
    const markedFeaturedCards = projectCards.filter(card => card.dataset.featured === 'true');
    const featuredCards = new Set(markedFeaturedCards.length ? markedFeaturedCards : projectCards.slice(0, 3));
    const additionalProjectCount = projectCards.length - featuredCards.size;
    const hasProjectDisclosure = Boolean(showMoreButton && additionalProjectCount > 0);
    let projectsExpanded = false;
    let activeFilterButton;
    let projectStatus = document.getElementById('project-filter-status');
    if (filterButtons.length && !projectStatus) {
        projectStatus = document.createElement('p');
        projectStatus.id = 'project-filter-status';
        projectStatus.className = 'sr-only';
        projectStatus.setAttribute('role', 'status');
        projectStatus.setAttribute('aria-atomic', 'true');
        document.querySelector('.project-filters')?.after(projectStatus);
    }
    function filterProjects(button, revealImmediately = true) {
        const filter = button.dataset.filter || 'all';
        const showFeaturedOnly = hasProjectDisclosure && filter === 'all' && !projectsExpanded;
        activeFilterButton = button;
        filterButtons.forEach(item => {
            const active = item === button;
            item.classList.toggle('active', active);
            item.setAttribute('aria-pressed', String(active));
        });
        let count = 0;
        projectCards.forEach(card => {
            const categories = (card.dataset.category || '').split(/\s+/);
            const visible = filter === 'all'
                ? !showFeaturedOnly || featuredCards.has(card)
                : categories.includes(filter);
            card.hidden = !visible;
            card.classList.toggle('hidden', !visible);
            if (visible) {
                count += 1;
                if (revealImmediately) {
                    card.classList.remove('reveal-pending');
                    card.classList.add('revealed');
                    card.style.removeProperty('--reveal-delay');
                }
            }
        });
        if (showMoreButton) {
            showMoreButton.hidden = !hasProjectDisclosure || filter !== 'all';
            showMoreButton.setAttribute('aria-expanded', String(projectsExpanded));
            showMoreButton.textContent = projectsExpanded
                ? 'Show fewer projects'
                : `See ${additionalProjectCount} more ${additionalProjectCount === 1 ? 'project' : 'projects'}`;
        }
        if (projectStatus) {
            projectStatus.textContent = filter === 'all'
                ? showFeaturedOnly
                    ? `${count} featured projects shown. ${additionalProjectCount} more available.`
                    : `All ${count} projects shown.`
                : `${count} ${count === 1 ? 'project' : 'projects'} shown for ${button.textContent.trim()}.`;
        }
        updateNavigation();
    }
    filterButtons.forEach(button => {
        button.type = 'button';
        button.addEventListener('click', () => filterProjects(button));
    });
    if (showMoreButton) {
        showMoreButton.type = 'button';
        showMoreButton.setAttribute('aria-controls', 'project-grid');
        showMoreButton.addEventListener('click', () => {
            projectsExpanded = !projectsExpanded;
            if (activeFilterButton) filterProjects(activeFilterButton);
            if (!projectsExpanded) {
                window.requestAnimationFrame(() => {
                    const bounds = showMoreButton.getBoundingClientRect();
                    const viewport = readingViewport();
                    if (bounds.top < viewport.top + (navbar?.offsetHeight || 80) || bounds.bottom > viewport.bottom) {
                        showMoreButton.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
                    }
                });
            }
        });
    }
    const initialFilter = filterButtons.find(button => button.classList.contains('active')) || filterButtons[0];
    if (initialFilter) filterProjects(initialFilter, false);

    // Project deep links must remain reachable after filtering or collapsing work.
    function revealLinkedProject(hash, recoverScroll = false) {
        let targetId;
        try {
            targetId = decodeURIComponent(hash.replace(/^#/, ''));
        } catch {
            return;
        }
        const target = projectCards.find(card => card.id === targetId);
        if (!target) return;
        const wasHidden = target.hidden || target.classList.contains('hidden');
        const previousTop = wasHidden ? null : target.getBoundingClientRect().top;
        if (!featuredCards.has(target)) projectsExpanded = true;
        const allProjectsButton = filterButtons.find(button => button.dataset.filter === 'all');
        if (allProjectsButton) filterProjects(allProjectsButton);
        else {
            target.hidden = false;
            target.classList.remove('hidden', 'reveal-pending');
        }
        // Native hash navigation already scrolls visible targets. Recover only
        // when revealing cards changed the target's position or it was hidden.
        const targetMoved = !wasHidden && Math.abs(target.getBoundingClientRect().top - previousTop) > 1;
        if (recoverScroll && (wasHidden || targetMoved)) {
            target.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        }
    }
    document.addEventListener('click', event => {
        if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const anchor = event.target.closest('a[href^="#"]');
        if (anchor) revealLinkedProject(anchor.getAttribute('href'));
        // Do not preventDefault: the browser owns fragment scrolling and history,
        // including clicks on the current hash after a filter hid its target.
    });
    window.addEventListener('hashchange', () => revealLinkedProject(window.location.hash, true));
    revealLinkedProject(window.location.hash, true);

});
