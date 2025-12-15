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
});
