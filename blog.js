const ready = (cb) => {
    if (document.readyState !== 'loading') {
        cb();
    } else {
        document.addEventListener('DOMContentLoaded', cb);
    }
};

ready(() => {
    const SUMMARY_COLLAPSED_HEIGHT = 220;
    const TAGS_COLLAPSED_HEIGHT = 96;
    const FOCUSABLE_SELECTORS = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    let openModalCount = 0;
    const createModalController = (modal, { focusSelector } = {}) => {
        if (!modal) return null;
        let previousFocus = null;

        const getFocusable = () =>
            Array.from(modal.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
                (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
            );

        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                controller.close();
                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            const focusables = getFocusable();
            if (focusables.length === 0) {
                event.preventDefault();
                return;
            }

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement;

            if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        const controller = {
            open() {
                if (!modal.hidden && modal.getAttribute('aria-hidden') === 'false') {
                    return;
                }
                previousFocus = document.activeElement;
                modal.hidden = false;
                modal.setAttribute('aria-hidden', 'false');
                openModalCount += 1;
                document.body.classList.add('modal-open');
                modal.addEventListener('keydown', handleKeydown);

                requestAnimationFrame(() => {
                    const focusTarget = (focusSelector && modal.querySelector(focusSelector)) || getFocusable()[0];
                    focusTarget?.focus();
                });
            },
            close() {
                if (modal.hidden) {
                    return;
                }

                modal.hidden = true;
                modal.setAttribute('aria-hidden', 'true');
                modal.removeEventListener('keydown', handleKeydown);
                openModalCount = Math.max(0, openModalCount - 1);
                if (openModalCount === 0) {
                    document.body.classList.remove('modal-open');
                }

                if (previousFocus && typeof previousFocus.focus === 'function') {
                    previousFocus.focus();
                }
                previousFocus = null;
            },
        };

        return controller;
    };

    const STORAGE_KEY = 'hashim-blog-drafts';
    const grid = document.querySelector('[data-blog-grid]');
    const filters = document.querySelectorAll('[data-filter]');
    const composer = document.querySelector('[data-composer]');
    const composerModal = createModalController(composer, { focusSelector: 'input[name="title"]' });
    const openComposer = document.querySelector('[data-open-composer]');
    const closeComposer = document.querySelectorAll('[data-close-composer]');
    const composerForm = document.querySelector('[data-composer-form]');
    let activeFilter = 'all';

    const defaultPosts = [
        {
            title: 'When Latency Is Your Product',
            summary:
                'Architecting a global inference mesh for AI copilots so every interaction stays sub-120ms while scaling to millions of requests.',
            cover: 'https://images.unsplash.com/photo-1507924538820-ede94a04019d?auto=format&fit=crop&w=900&q=80',
            categories: ['ai', 'case-study'],
            tags: ['AI', 'Latency', 'Azure'],
            readingTime: '6 min read',
            date: 'Sep 2024',
            link: 'blog-post.html',
        },
        {
            title: 'Designing Guardrails for Multi-Cloud Deployments',
            summary: 'Patterns that keep Terraform, Azure Policy, and AWS Control Tower in sync without slowing down platform teams.',
            cover: 'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=900&q=80',
            categories: ['cloud', 'devops'],
            tags: ['Cloud', 'Azure', 'Terraform'],
            readingTime: '5 min read',
            date: 'Jul 2024',
            link: 'blog-post.html',
        },
        {
            title: 'Telemetry-Driven Incident Reviews',
            summary: 'How blending OpenTelemetry traces with human runbooks reduced MTTR by 37% across a distributed platform team.',
            cover: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80',
            categories: ['devops'],
            tags: ['DevOps', 'Observability'],
            readingTime: '4 min read',
            date: 'Jun 2024',
            link: 'blog-post.html',
        },
        {
            title: 'Evaluating AI Assistants in Regulated Environments',
            summary: 'Checklist for rolling out LLM copilots inside banks and healthcare orgs without creating compliance nightmares.',
            cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
            categories: ['ai'],
            tags: ['AI', 'Security', 'Compliance'],
            readingTime: '7 min read',
            date: 'May 2024',
            link: 'blog-post.html',
        },
        {
            title: 'Scaling FinOps Dashboards Without Creating Noise',
            summary: 'Lessons from building a FinOps board that guides action instead of overwhelming finance and engineering teams.',
            cover: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80',
            categories: ['case-study', 'cloud'],
            tags: ['Case Study', 'FinOps', 'Cloud'],
            readingTime: '8 min read',
            date: 'Apr 2024',
            link: 'blog-post.html',
        },
    ];

    const readDrafts = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (error) {
            console.warn('Unable to read drafts', error);
            return [];
        }
    };

    const saveDrafts = (drafts) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
        } catch (error) {
            console.warn('Unable to save drafts', error);
        }
    };

    let drafts = readDrafts();
    let editingId = null;

    const getAllPosts = () => [
        ...drafts.map((draft) => ({ ...draft, __source: 'draft' })),
        ...defaultPosts.map((post) => ({ ...post, __source: 'default' })),
    ];

    const hydrateCardOverflow = (details) => {
        if (!details) return;
        const summaryWrapper = details.querySelector('[data-card-summary]');
        const tagsWrapper = details.querySelector('[data-card-tags]');
        const toggle = details.querySelector('[data-card-toggle]');
        if (!summaryWrapper || !toggle) return;

        const summaryNeedsClamp = summaryWrapper.scrollHeight > SUMMARY_COLLAPSED_HEIGHT + 12;
        const tagsNeedsClamp = tagsWrapper ? tagsWrapper.scrollWidth > tagsWrapper.clientWidth + 16 : false;
        const requiresToggle = summaryNeedsClamp || tagsNeedsClamp;

        if (!summaryNeedsClamp) {
            summaryWrapper.classList.add('is-expanded');
            summaryWrapper.classList.remove('is-collapsed');
        } else {
            summaryWrapper.style.setProperty('--summary-max', `${SUMMARY_COLLAPSED_HEIGHT}px`);
            summaryWrapper.classList.add('is-collapsed');
            summaryWrapper.classList.remove('is-expanded');
        }

        if (tagsWrapper) {
            if (tagsNeedsClamp) {
                tagsWrapper.classList.add('is-scrollable');
            } else {
                tagsWrapper.classList.remove('is-scrollable');
            }
        }

        if (!requiresToggle) {
            toggle.hidden = true;
            toggle.setAttribute('aria-hidden', 'true');
            toggle.setAttribute('aria-expanded', 'true');
            return;
        }

        toggle.hidden = false;
        toggle.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = 'Read more';

        const handleToggle = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            const nextState = !expanded;
            toggle.setAttribute('aria-expanded', String(nextState));
            toggle.textContent = nextState ? 'Show less' : 'Read more';

            if (summaryNeedsClamp) {
                summaryWrapper.classList.toggle('is-expanded', nextState);
                summaryWrapper.classList.toggle('is-collapsed', !nextState);
            }

            if (tagsWrapper && tagsNeedsClamp) {
                tagsWrapper.scrollTo({
                    left: nextState ? tagsWrapper.scrollWidth : 0,
                    behavior: 'smooth',
                });
            }
        };

        toggle.addEventListener('click', handleToggle);
        toggle.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                handleToggle(event);
            }
        });
    };

    const renderPosts = () => {
        if (!grid) return;
        grid.innerHTML = '';
        const posts = getAllPosts();
        const fragment = document.createDocumentFragment();

        posts.forEach((post) => {
            const matches =
                activeFilter === 'all' || (post.categories && post.categories.includes(activeFilter));

            if (!matches) return;

            const article = document.createElement('article');
            article.className = 'blog-card';
            article.dataset.category = post.categories.join(' ');
            if (post.__source === 'draft' && post.id) {
                article.dataset.draftId = post.id;
            }
            article.innerHTML = `
                <a href="${post.link || 'blog-post.html'}" class="card-link">
                    <img src="${post.cover}" alt="${post.title}" loading="lazy" />
                    <div class="card-body">
                        <div class="card-meta">
                            <span>${post.categories.map((c) => c.replace('-', ' ')).join(' • ')}</span>
                            <span>${post.readingTime}</span>
                            <span>${post.date}</span>
                        </div>
                        <h2>${post.title}</h2>
                        <div class="card-details" data-card-details>
                            <div class="card-summary-wrapper" data-card-summary>
                                <p class="card-summary">${post.summary}</p>
                            </div>
                            <div class="card-tags-wrapper" data-card-tags>
                                <ul class="tag-list">
                                    ${(post.tags || [])
                                        .map((tag) => `<li>${tag.trim()}</li>`)
                                        .join('')}
                                </ul>
                            </div>
                            <button type="button" class="card-toggle" data-card-toggle aria-expanded="false">
                                Read more
                            </button>
                        </div>
                    </div>
                </a>
            `;
            const linkEl = article.querySelector('.card-link');
            linkEl.addEventListener('click', (event) => {
                event.preventDefault();
                window.location.href = linkEl.getAttribute('href');
            });

            if (post.__source === 'draft' && post.id) {
                const controls = document.createElement('div');
                controls.className = 'card-controls';

                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.className = 'card-controls__btn';
                editBtn.textContent = 'Edit';
                editBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    startEdit(post.id);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'card-controls__btn card-controls__btn--danger';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    const confirmed =
                        window.confirm?.('Delete this draft? This action cannot be undone.') ?? true;
                    if (confirmed) {
                        deleteDraft(post.id);
                    }
                });

                controls.appendChild(editBtn);
                controls.appendChild(deleteBtn);
                article.appendChild(controls);
            }
            fragment.appendChild(article);
        });

        if (!fragment.children.length) {
            const empty = document.createElement('p');
            empty.className = 'lead';
            empty.textContent = 'No posts in this category yet. Draft one using the Quick Draft button.';
            grid.appendChild(empty);
        } else {
            grid.appendChild(fragment);
            requestAnimationFrame(() => {
                const detailsNodes = grid.querySelectorAll('[data-card-details]');
                detailsNodes.forEach((node) => hydrateCardOverflow(node));
            });
        }
    };

    if (filters.length) {
        filters.forEach((filter) => {
            filter.addEventListener('click', () => {
                filters.forEach((btn) => btn.classList.remove('is-active'));
                filter.classList.add('is-active');
                activeFilter = filter.dataset.filter || 'all';
                renderPosts();
            });
        });
    }

    renderPosts();

    const toggleComposer = (show, options = {}) => {
        const { skipReset = false } = options;
        if (!composerModal) return;
        if (show) {
            composerModal.open();
        } else {
            composerModal.close();
            if (!skipReset) {
                composerForm?.reset();
            }
            editingId = null;
        }
    };

    const startEdit = (id) => {
        const draft = drafts.find((item) => item.id === id);
        if (!draft || !composerForm) return;
        editingId = id;
        toggleComposer(true, { skipReset: true });
        composerForm.title.value = draft.title;
        composerForm.summary.value = draft.summary;
        composerForm.cover.value = draft.cover;
        composerForm.tags.value = draft.tags?.join(', ') || '';
        composerForm.category.value = draft.categories?.[0] || 'ai';
        composerForm.readingTime.value = draft.readingTime;
        composerForm.date.value = draft.date;
        composerForm.link.value = draft.link || 'blog-post.html';
    };

    const deleteDraft = (id) => {
        drafts = drafts.filter((draft) => draft.id !== id);
        saveDrafts(drafts);
        renderPosts();
    };

    openComposer?.addEventListener('click', () => toggleComposer(true));
    closeComposer.forEach((btn) => btn.addEventListener('click', () => toggleComposer(false)));

    composerForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(composerForm);
        const tags = (formData.get('tags') || '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
        const post = {
            id: editingId || `draft-${Date.now()}`,
            title: formData.get('title'),
            summary: formData.get('summary'),
            cover: formData.get('cover'),
            tags,
            categories: [formData.get('category') || 'ai'],
            readingTime: formData.get('readingTime'),
            date: formData.get('date'),
            link: formData.get('link') || 'blog-post.html',
        };
        if (editingId) {
            drafts = drafts.map((draft) => (draft.id === editingId ? post : draft));
        } else {
            drafts = [post, ...drafts];
        }
        saveDrafts(drafts);
        renderPosts();
        toggleComposer(false);
    });

    const tocContainer = document.querySelector('[data-toc]');
    const article = document.querySelector('[data-article]');
    if (tocContainer && article) {
        const headings = article.querySelectorAll('h2');
        const list = document.createElement('ol');
        headings.forEach((heading, index) => {
            const id = heading.id || `section-${index + 1}`;
            heading.id = id;
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = `#${id}`;
            link.textContent = heading.textContent;
            item.appendChild(link);
            list.appendChild(item);
        });
        tocContainer.appendChild(list);
    }

    const postShell = document.querySelector('[data-post-id]');
    if (postShell) {
        const postId = postShell.dataset.postId || 'post';
        const POST_STORAGE_KEY = `hashim-post-${postId}`;
        const editorModalEl = document.querySelector('[data-post-editor]');
        const editorModal = createModalController(editorModalEl, { focusSelector: 'input[name="title"]' });
        const openEditorBtn = document.querySelector('[data-open-post-editor]');
        const closeEditorBtns = document.querySelectorAll('[data-close-post-editor]');
        const editorForm = document.querySelector('[data-post-editor-form]');

        const getField = (selector) => document.querySelector(selector);

        const fieldRefs = {
            title: getField('[data-field="title"]'),
            excerpt: getField('[data-field="excerpt"]'),
            readingTime: getField('[data-field="readingTime"]'),
            date: getField('[data-field="date"]'),
            tags: getField('[data-field="tags"]'),
            problem: getField('[data-field="problem"] p'),
            constraints: getField('[data-field="constraints"]'),
            architecture: getField('[data-field="architecture"] p'),
            code: getField('[data-field="code"]'),
            decisions: getField('[data-field="decisions"] ol'),
            lessons: getField('[data-field="lessons"] p'),
            outcome: getField('[data-field="outcome"] p'),
        };

        const readCurrentData = () => ({
            title: fieldRefs.title?.textContent.trim() || '',
            excerpt: fieldRefs.excerpt?.textContent.trim() || '',
            readingTime: fieldRefs.readingTime?.textContent.trim() || '',
            date: fieldRefs.date?.textContent.trim() || '',
            tags: Array.from(fieldRefs.tags?.querySelectorAll('li') || []).map((li) => li.textContent.trim()),
            problem: fieldRefs.problem?.textContent.trim() || '',
            constraints: Array.from(fieldRefs.constraints?.querySelectorAll('li') || []).map((li) =>
                li.textContent.trim()
            ),
            architecture: fieldRefs.architecture?.textContent.trim() || '',
            code: fieldRefs.code?.textContent || '',
            decisions: Array.from(fieldRefs.decisions?.querySelectorAll('li') || []).map((li) =>
                li.textContent.trim()
            ),
            lessons: fieldRefs.lessons?.textContent.trim() || '',
            outcome: fieldRefs.outcome?.textContent.trim() || '',
        });

        const applyData = (data) => {
            if (!data) return;
            if (fieldRefs.title) fieldRefs.title.textContent = data.title;
            if (fieldRefs.excerpt) fieldRefs.excerpt.textContent = data.excerpt;
            if (fieldRefs.readingTime) fieldRefs.readingTime.textContent = data.readingTime;
            if (fieldRefs.date) fieldRefs.date.textContent = data.date;

            if (fieldRefs.tags) {
                fieldRefs.tags.innerHTML = (data.tags || []).map((tag) => `<li>${tag}</li>`).join('');
            }

            if (fieldRefs.problem) fieldRefs.problem.textContent = data.problem;

            if (fieldRefs.constraints) {
                fieldRefs.constraints.innerHTML = (data.constraints || [])
                    .map((item) => `<li>${item}</li>`)
                    .join('');
            }

            if (fieldRefs.architecture) fieldRefs.architecture.textContent = data.architecture;
            if (fieldRefs.code) fieldRefs.code.textContent = data.code;

            if (fieldRefs.decisions) {
                fieldRefs.decisions.innerHTML = (data.decisions || []).map((item) => `<li>${item}</li>`).join('');
            }

            if (fieldRefs.lessons) fieldRefs.lessons.textContent = data.lessons;
            if (fieldRefs.outcome) fieldRefs.outcome.textContent = data.outcome;
        };

        const loadPostData = () => {
            try {
                const raw = localStorage.getItem(POST_STORAGE_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch (error) {
                console.warn('Unable to load post data', error);
                return null;
            }
        };

        const savePostData = (payload) => {
            try {
                localStorage.setItem(POST_STORAGE_KEY, JSON.stringify(payload));
            } catch (error) {
                console.warn('Unable to save post data', error);
            }
        };

        const defaultPostData = readCurrentData();
        const storedPostData = loadPostData();
        applyData(storedPostData || defaultPostData);

        const toggleEditor = (show) => {
            if (!editorModal) return;
            if (show) {
                const current = readCurrentData();
                if (editorForm) {
                    editorForm.title.value = current.title;
                    editorForm.excerpt.value = current.excerpt;
                    editorForm.readingTime.value = current.readingTime;
                    editorForm.date.value = current.date;
                    editorForm.tags.value = (current.tags || []).join(', ');
                    editorForm.problem.value = current.problem;
                    editorForm.constraints.value = (current.constraints || []).join('\n');
                    editorForm.architecture.value = current.architecture;
                    editorForm.code.value = current.code;
                    editorForm.decisions.value = (current.decisions || []).join('\n');
                    editorForm.lessons.value = current.lessons;
                    editorForm.outcome.value = current.outcome;
                }
                editorModal.open();
            } else {
                editorModal.close();
            }
        };

        openEditorBtn?.addEventListener('click', () => toggleEditor(true));
        closeEditorBtns.forEach((btn) => btn.addEventListener('click', () => toggleEditor(false)));

        editorForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(editorForm);
            const payload = {
                title: formData.get('title'),
                excerpt: formData.get('excerpt'),
                readingTime: formData.get('readingTime'),
                date: formData.get('date'),
                tags: (formData.get('tags') || '')
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                problem: formData.get('problem'),
                constraints: (formData.get('constraints') || '')
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean),
                architecture: formData.get('architecture'),
                code: formData.get('code'),
                decisions: (formData.get('decisions') || '')
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean),
                lessons: formData.get('lessons'),
                outcome: formData.get('outcome'),
            };
            applyData(payload);
            savePostData(payload);
            toggleEditor(false);
        });

        const blocksContainer = document.querySelector('[data-dynamic-blocks]');
        const blockModalEl = document.querySelector('[data-block-editor]');
        const blockModal = createModalController(blockModalEl, { focusSelector: 'input[name="blockTitle"]' });
        const blockForm = document.querySelector('[data-block-editor-form]');
        const openBlockBtn = document.querySelector('[data-open-block-editor]');
        const closeBlockBtns = document.querySelectorAll('[data-close-block-editor]');
        const BLOCKS_KEY = `${POST_STORAGE_KEY}-blocks`;
        let blockDrafts = [];
        let editingBlockId = null;

        const loadBlocks = () => {
            try {
                const raw = localStorage.getItem(BLOCKS_KEY);
                blockDrafts = raw ? JSON.parse(raw) : [];
            } catch (error) {
                blockDrafts = [];
            }
        };

        const saveBlocks = () => {
            try {
                localStorage.setItem(BLOCKS_KEY, JSON.stringify(blockDrafts));
            } catch (error) {
                console.warn('Unable to save blocks', error);
            }
        };

        const renderBlocks = () => {
            if (!blocksContainer) return;
            blocksContainer.innerHTML = '';
            if (!blockDrafts.length) {
                const empty = document.createElement('p');
                empty.className = 'lead';
                empty.textContent = 'Add notebook-style blocks to capture extra context or code.';
                blocksContainer.appendChild(empty);
                return;
            }
            blockDrafts.forEach((block) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'dynamic-block';
                wrapper.dataset.blockId = block.id;
                const title = block.title ? `<h3>${block.title}</h3>` : '';
                let contentMarkup = '';
                if (block.type === 'code') {
                    contentMarkup = `
                        <div class="code-cell">
                            <div class="code-header"><span></span><span></span><span></span><p>${block.title || 'notebook-cell'}</p></div>
                            <pre><code>${block.content}</code></pre>
                        </div>
                    `;
                } else {
                    contentMarkup = `<p>${block.content.replace(/\n/g, '<br />')}</p>`;
                }
                wrapper.innerHTML = `
                    <div class="block-actions">
                        <button type="button" data-edit-block="${block.id}">Edit</button>
                        <button type="button" data-remove-block="${block.id}">Delete</button>
                    </div>
                    ${title}
                    ${contentMarkup}
                `;
                blocksContainer.appendChild(wrapper);
            });
        };

        const toggleBlockEditor = (show, options = {}) => {
            if (!blockModal) return;
            if (show) {
                blockModal.open();
            } else {
                blockModal.close();
                if (!options.skipReset) {
                    blockForm?.reset();
                    editingBlockId = null;
                }
            }
        };

        const startBlockEdit = (id) => {
            const block = blockDrafts.find((item) => item.id === id);
            if (!block || !blockForm) return;
            editingBlockId = id;
            toggleBlockEditor(true, { skipReset: true });
            blockForm.blockTitle.value = block.title || '';
            blockForm.blockType.value = block.type;
            blockForm.blockContent.value = block.content;
        };

        blocksContainer?.addEventListener('click', (event) => {
            const editId = event.target.closest('[data-edit-block]')?.dataset.editBlock;
            const removeId = event.target.closest('[data-remove-block]')?.dataset.removeBlock;
            if (editId) {
                startBlockEdit(editId);
            } else if (removeId) {
                blockDrafts = blockDrafts.filter((block) => block.id !== removeId);
                saveBlocks();
                renderBlocks();
            }
        });

        openBlockBtn?.addEventListener('click', () => toggleBlockEditor(true));
        closeBlockBtns.forEach((btn) => btn.addEventListener('click', () => toggleBlockEditor(false)));

        blockForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(blockForm);
            const payload = {
                id: editingBlockId || `block-${Date.now()}`,
                title: formData.get('blockTitle'),
                type: formData.get('blockType'),
                content: formData.get('blockContent'),
            };
            if (editingBlockId) {
                blockDrafts = blockDrafts.map((block) => (block.id === editingBlockId ? payload : block));
            } else {
                blockDrafts = [payload, ...blockDrafts];
            }
            saveBlocks();
            renderBlocks();
            toggleBlockEditor(false);
        });

        loadBlocks();
        renderBlocks();
    }
});
