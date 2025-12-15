const ready = (cb) => {
    if (document.readyState !== 'loading') {
        cb();
    } else {
        document.addEventListener('DOMContentLoaded', cb);
    }
};

ready(() => {
    const themeToggle = document.querySelector('.theme-toggle');
    const themeToggleLabel = document.querySelector('.theme-toggle__label');
    const THEME_KEY = 'hashim-theme-preference';

    const applyTheme = (desired) => {
        const normalized = desired === 'theme-light' ? 'theme-light' : 'theme-dark';
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add(normalized);

        if (themeToggle) {
            themeToggle.setAttribute('aria-pressed', String(normalized === 'theme-light'));
        }

        if (themeToggleLabel) {
            themeToggleLabel.textContent = normalized === 'theme-light' ? 'Light' : 'Dark';
        }
    };

    let storedTheme = null;
    try {
        storedTheme = localStorage.getItem(THEME_KEY);
    } catch (error) {
        console.warn('Unable to read saved theme preference.', error);
    }

    applyTheme(
        storedTheme || (document.body.classList.contains('theme-light') ? 'theme-light' : 'theme-dark')
    );

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const nextTheme = document.body.classList.contains('theme-light') ? 'theme-dark' : 'theme-light';
            applyTheme(nextTheme);
            try {
                localStorage.setItem(THEME_KEY, nextTheme);
            } catch (error) {
                console.warn('Unable to persist theme preference.', error);
            }
        });
    }

    const sections = document.querySelectorAll('[data-animate]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if ('IntersectionObserver' in window && sections.length > 0) {
        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        obs.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.25 }
        );

        sections.forEach((section) => observer.observe(section));
    } else {
        sections.forEach((section) => section.classList.add('animate-in'));
    }

    if (!reduceMotion) {
        const tiltCards = document.querySelectorAll('[data-tilt]');

        tiltCards.forEach((card) => {
            card.addEventListener('mousemove', (event) => {
                const bounds = card.getBoundingClientRect();
                const x = event.clientX - bounds.left;
                const y = event.clientY - bounds.top;
                const rotateX = ((y - bounds.height / 2) / bounds.height) * -10;
                const rotateY = ((x - bounds.width / 2) / bounds.width) * 10;

                card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    const heroPhoto = document.querySelector('.photo-frame img');
    if (heroPhoto) {
        heroPhoto.addEventListener('error', () => {
            const fallbackSrc = heroPhoto.dataset.placeholder;
            if (fallbackSrc && heroPhoto.src !== fallbackSrc) {
                heroPhoto.src = fallbackSrc;
            } else {
                heroPhoto.classList.add('is-hidden');
            }
        });

        if (heroPhoto.complete && heroPhoto.naturalWidth === 0) {
            heroPhoto.dispatchEvent(new Event('error'));
        }
    }

    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    // Compact horizontal carousel for Project Visuals.
    const visualCarousels = document.querySelectorAll('[data-visuals-carousel]');
    if (visualCarousels.length > 0) {
        visualCarousels.forEach((carousel) => {
            const track = carousel.querySelector('[data-visuals-track]');
            const slides = Array.from(carousel.querySelectorAll('[data-visual-slide]'));
            const prevBtn = carousel.querySelector('[data-carousel-prev]');
            const nextBtn = carousel.querySelector('[data-carousel-next]');

            if (!track || slides.length === 0) {
                return;
            }

            let currentIndex = 0;
            let rafId = null;

            const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

            const scrollToSlide = (index, smooth = true) => {
                const normalized = (index + slides.length) % slides.length;
                const slide = slides[normalized];
                const viewportWidth = track.clientWidth;
                const slideWidth = slide.clientWidth;
                const target = slide.offsetLeft - 16;
                const maxScroll = track.scrollWidth - viewportWidth;
                const clamped = clamp(target, 0, Math.max(0, maxScroll));

                track.scrollTo({
                    left: clamped,
                    behavior: smooth ? 'smooth' : 'auto',
                });

                currentIndex = normalized;
            };

            const handlePrev = () => scrollToSlide(currentIndex - 1);
            const handleNext = () => scrollToSlide(currentIndex + 1);

            prevBtn?.addEventListener('click', handlePrev);
            nextBtn?.addEventListener('click', handleNext);

            const syncIndexFromScroll = () => {
                const viewportCenter = track.scrollLeft + track.clientWidth / 2;
                let closestIndex = currentIndex;
                let smallestDelta = Number.POSITIVE_INFINITY;

                slides.forEach((slide, idx) => {
                    const slideCenter = slide.offsetLeft + slide.clientWidth / 2;
                    const delta = Math.abs(slideCenter - viewportCenter);
                    if (delta < smallestDelta) {
                        smallestDelta = delta;
                        closestIndex = idx;
                    }
                });

                currentIndex = closestIndex;
            };

            track.addEventListener('scroll', () => {
                if (rafId) {
                    cancelAnimationFrame(rafId);
                }
                rafId = requestAnimationFrame(syncIndexFromScroll);
            });

            carousel.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    handlePrev();
                } else if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    handleNext();
                }
            });

            const handleResize = () => scrollToSlide(currentIndex, false);
            window.addEventListener('resize', handleResize);

            scrollToSlide(0, false);
        });
    }

    // Modal/lightbox for Project Visuals cards with focus and keyboard support.
    const lightbox = document.querySelector('[data-lightbox]');
    const visualTriggers = document.querySelectorAll('[data-visual-trigger]');

    if (lightbox && visualTriggers.length > 0) {
        const lightboxMedia = lightbox.querySelector('[data-lightbox-media]');
        const lightboxDialog = lightbox.querySelector('.lightbox__dialog');
        const lightboxTitle = lightbox.querySelector('[data-lightbox-title]');
        const lightboxDesc = lightbox.querySelector('[data-lightbox-desc]');
        const closeBtn = lightbox.querySelector('[data-lightbox-close]');
        const dismissTarget = lightbox.querySelector('[data-lightbox-dismiss]');
        let lastFocusedElement = null;

        const decodeSource = (src) => {
            try {
                return decodeURIComponent(src);
            } catch (error) {
                return src;
            }
        };

        const buildMediaNode = (type, src, altText) => {
            if (type === 'video') {
                const video = document.createElement('video');
                video.src = src;
                video.controls = true;
                video.autoplay = true;
                video.muted = true;
                video.loop = true;
                video.playsInline = true;
                video.setAttribute('aria-label', altText || 'Project video preview');
                return video;
            }
            const image = document.createElement('img');
            image.src = src;
            image.alt = altText || 'Project visual preview';
            image.loading = 'lazy';
            return image;
        };

        const openLightbox = (trigger) => {
            if (!lightboxMedia) {
                return;
            }

            const { type = 'image', src = '', title = '', summary = '', alt = '' } = trigger.dataset;
            const resolvedSrc = decodeSource(src);
            if (!resolvedSrc) {
                return;
            }

            lightboxMedia.innerHTML = '';
            lightboxDialog?.classList.remove('app-launch');
            const fallbackAlt =
                alt ||
                trigger.getAttribute('aria-label') ||
                trigger.querySelector('img')?.getAttribute('alt') ||
                '';
            const mediaNode = buildMediaNode(type, resolvedSrc, fallbackAlt);
            lightboxMedia.appendChild(mediaNode);

            if (lightboxDialog && type === 'video') {
                requestAnimationFrame(() => {
                    lightboxDialog.classList.add('app-launch');
                });
            }

            if (lightboxTitle) {
                lightboxTitle.textContent = title || 'Project preview';
            }

            if (lightboxDesc) {
                lightboxDesc.textContent = summary || fallbackAlt || '';
            }

            lightbox.hidden = false;
            lightbox.setAttribute('aria-hidden', 'false');
            document.body.classList.add('lightbox-open');
            lastFocusedElement = trigger;

            requestAnimationFrame(() => {
                closeBtn?.focus();
            });
        };

        const closeLightbox = () => {
            if (lightbox.hidden) {
                return;
            }

            lightbox.hidden = true;
            lightbox.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('lightbox-open');
            lightboxMedia.innerHTML = '';
            lightboxDialog?.classList.remove('app-launch');

            if (lastFocusedElement) {
                lastFocusedElement.focus();
                lastFocusedElement = null;
            }
        };

        visualTriggers.forEach((trigger) => {
            trigger.addEventListener('click', () => openLightbox(trigger));
        });

        closeBtn?.addEventListener('click', closeLightbox);
        dismissTarget?.addEventListener('click', closeLightbox);

        lightbox.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeLightbox();
                return;
            }

            if (event.key === 'Tab') {
                const focusableSelectors = [
                    'button:not([disabled])',
                    '[href]',
                    'input:not([disabled])',
                    'select:not([disabled])',
                    'textarea:not([disabled])',
                    '[tabindex]:not([tabindex="-1"])',
                ];
                const focusables = Array.from(
                    lightbox.querySelectorAll(focusableSelectors.join(','))
                );

                if (focusables.length === 0) {
                    event.preventDefault();
                    return;
                }

                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                const isShift = event.shiftKey;
                const active = document.activeElement;

                if (isShift && active === first) {
                    last.focus();
                    event.preventDefault();
                } else if (!isShift && active === last) {
                    first.focus();
                    event.preventDefault();
                }
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !lightbox.hidden) {
                closeLightbox();
            }
        });
    }
});
