const ready = (cb) => {
    if (document.readyState !== 'loading') {
        cb();
    } else {
        document.addEventListener('DOMContentLoaded', cb);
    }
};

ready(() => {
    const STORAGE_KEY = 'hashim-blog-drafts';
    const grid = document.querySelector('[data-blog-grid]');
    const filters = document.querySelectorAll('[data-filter]');
    const composer = document.querySelector('[data-composer]');
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

    const getAllPosts = () => [
        ...drafts.map((draft) => ({ ...draft, __source: 'draft' })),
        ...defaultPosts.map((post) => ({ ...post, __source: 'default' })),
    ];

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
                        <p>${post.summary}</p>
                        <ul class="tag-list">
                            ${(post.tags || [])
                                .map((tag) => `<li>${tag.trim()}</li>`)
                                .join('')}
                        </ul>
                    </div>
                </a>
            `;
            const linkEl = article.querySelector('.card-link');
            linkEl.addEventListener('click', (event) => {
                event.preventDefault();
                window.location.href = linkEl.getAttribute('href');
            });

            if (post.__source === 'draft' && post.id) {
                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.className = 'edit-btn';
                editBtn.textContent = 'Edit';
                editBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    startEdit(post.id);
                });
                article.appendChild(editBtn);
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
        if (!composer) return;
        composer.hidden = !show;
        if (show) {
            composer.querySelector('input[name="title"]')?.focus();
        } else {
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
        const editorModal = document.querySelector('[data-post-editor]');
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
            editorModal.hidden = !show;
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
                editorForm?.querySelector('input[name="title"]')?.focus();
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
        const blockModal = document.querySelector('[data-block-editor]');
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
            blockModal.hidden = !show;
            if (!show && !options.skipReset) {
                blockForm?.reset();
                editingBlockId = null;
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
