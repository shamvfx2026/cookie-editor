const SAVED_ARTICLES_KEY = 'pulsebrief_saved_articles';

const state = {
  page: 1,
  pageSize: 12,
  category: '',
  search: '',
  sort: 'newest',
  loading: false,
  hasMore: true,
  savedArticles: [],
};

const elements = {
  searchInput: document.getElementById('searchInput'),
  categorySelect: document.getElementById('categorySelect'),
  sortSelect: document.getElementById('sortSelect'),
  newsGrid: document.getElementById('newsGrid'),
  skeletonGrid: document.getElementById('skeletonGrid'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  emptyState: document.getElementById('emptyState'),
  themeToggle: document.getElementById('themeToggle'),
  headlineSection: document.getElementById('headlineSection'),
  headlineTitle: document.getElementById('headlineTitle'),
  headlineDescription: document.getElementById('headlineDescription'),
  headlineLink: document.getElementById('headlineLink'),
  latestList: document.getElementById('latestList'),
  olderList: document.getElementById('olderList'),
  savedList: document.getElementById('savedList'),
  tickerTrack: document.getElementById('tickerTrack'),
  lastUpdated: document.getElementById('lastUpdated'),
};

function setTheme(mode) {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem('theme', mode);
}

function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
}

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sortArticles(articles) {
  const list = [...articles];

  if (state.sort === 'oldest') {
    return list.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
  }

  if (state.sort === 'source') {
    return list.sort((a, b) => (a.source || '').localeCompare(b.source || ''));
  }

  return list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function renderSkeletons(count = 6) {
  elements.skeletonGrid.classList.remove('hidden');
  elements.skeletonGrid.innerHTML = Array.from({ length: count })
    .map(
      () => `
      <article class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div class="h-40 animate-pulse bg-slate-200 dark:bg-slate-700"></div>
        <div class="space-y-2 p-4">
          <div class="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
          <div class="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
          <div class="h-4 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
          <div class="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
        </div>
      </article>
    `,
    )
    .join('');
}

function hideSkeletons() {
  elements.skeletonGrid.classList.add('hidden');
  elements.skeletonGrid.innerHTML = '';
}

function renderHeadline(article) {
  if (!article) {
    elements.headlineSection.classList.add('hidden');
    return;
  }

  elements.headlineSection.classList.remove('hidden');
  elements.headlineTitle.textContent = article.title || 'Top story';
  elements.headlineDescription.textContent = article.description || 'No description available.';
  if (article.url) {
    elements.headlineLink.href = article.url;
    elements.headlineLink.classList.remove('hidden');
  } else {
    elements.headlineLink.classList.add('hidden');
  }
}

function renderSidebarList(target, articles, emptyMessage) {
  if (!articles.length) {
    target.innerHTML = `<li class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(emptyMessage)}</li>`;
    return;
  }

  target.innerHTML = articles
    .map(
      (article) => `
      <li>
        <a href="${escapeHtml(article.url || '#')}" target="_blank" rel="noopener noreferrer" class="block rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700">
          <p class="line-clamp-2 font-medium">${escapeHtml(article.title)}</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">${escapeHtml(article.source || 'Unknown source')}</p>
        </a>
      </li>
    `,
    )
    .join('');
}

function renderTicker(articles) {
  if (!articles.length) {
    elements.tickerTrack.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">No breaking updates.</p>';
    return;
  }

  const items = articles
    .slice(0, 8)
    .map((article) => `<span class="inline-block mr-8">• ${escapeHtml(article.title)}</span>`)
    .join('');

  elements.tickerTrack.innerHTML = `<div class="ticker-content">${items}${items}</div>`;
}

function readSavedArticles() {
  try {
    const raw = localStorage.getItem(SAVED_ARTICLES_KEY);
    state.savedArticles = raw ? JSON.parse(raw) : [];
  } catch {
    state.savedArticles = [];
  }
}

function persistSavedArticles() {
  localStorage.setItem(SAVED_ARTICLES_KEY, JSON.stringify(state.savedArticles));
}

function isSaved(article) {
  return state.savedArticles.some((saved) => saved.url && saved.url === article.url);
}

function toggleSaveArticle(article) {
  if (!article.url) {
    return;
  }

  if (isSaved(article)) {
    state.savedArticles = state.savedArticles.filter((saved) => saved.url !== article.url);
  } else {
    state.savedArticles.unshift({
      title: article.title,
      source: article.source,
      url: article.url,
    });
    state.savedArticles = state.savedArticles.slice(0, 20);
  }

  persistSavedArticles();
  renderSidebarList(elements.savedList, state.savedArticles.slice(0, 6), 'No saved articles yet.');
}

function renderSidebars(articles) {
  const latest = articles.slice(0, 5);
  const older = articles.slice(5, 10);
  renderSidebarList(elements.latestList, latest, 'No latest items right now.');
  renderSidebarList(elements.olderList, older, 'No older items right now.');
  renderSidebarList(elements.savedList, state.savedArticles.slice(0, 6), 'No saved articles yet.');
}

function renderNewsCard(article) {
  const imageUrl = article.image || 'https://placehold.co/600x400?text=No+Image';
  const publishedDate = new Date(article.publishedAt).toLocaleString();
  const saved = isSaved(article);

  return `
    <article class="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(article.title)}" class="h-44 w-full object-cover" loading="lazy" referrerpolicy="no-referrer" />
      <div class="space-y-3 p-4">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400">${escapeHtml(article.category)}</p>
          <button data-save-url="${escapeHtml(article.url || '')}" class="rounded-md border px-2 py-1 text-xs ${saved ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-300'}">${saved ? 'Saved' : 'Save'}</button>
        </div>
        <h2 class="line-clamp-2 text-base font-semibold">${escapeHtml(article.title)}</h2>
        <p class="line-clamp-3 text-sm text-slate-600 dark:text-slate-300">${escapeHtml(article.description || '')}</p>
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>${escapeHtml(article.source || 'Unknown')}</span>
          <time datetime="${escapeHtml(article.publishedAt)}">${escapeHtml(publishedDate)}</time>
        </div>
        ${
          article.url
            ? `<a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400">Read full article →</a>`
            : ''
        }
      </div>
    </article>
  `;
}

function bindSaveButtons(articles) {
  elements.newsGrid.querySelectorAll('[data-save-url]').forEach((button) => {
    button.addEventListener('click', () => {
      const url = button.getAttribute('data-save-url');
      const selectedArticle = articles.find((item) => item.url === url);
      if (!selectedArticle) {
        return;
      }
      toggleSaveArticle(selectedArticle);
      const refreshed = sortArticles(articles);
      elements.newsGrid.innerHTML = refreshed.map(renderNewsCard).join('');
      bindSaveButtons(refreshed);
    });
  });
}

function updateLoadMore(hasMore) {
  state.hasMore = hasMore;
  if (hasMore) {
    elements.loadMoreBtn.classList.remove('hidden');
  } else {
    elements.loadMoreBtn.classList.add('hidden');
  }
}

function resetResults() {
  state.page = 1;
  elements.newsGrid.innerHTML = '';
  elements.emptyState.classList.add('hidden');
  updateLoadMore(true);
}

async function fetchNews({ append = false } = {}) {
  if (state.loading) {
    return;
  }

  state.loading = true;
  elements.loadMoreBtn.disabled = true;

  if (!append) {
    renderSkeletons();
  }

  try {
    const params = new URLSearchParams({
      page: String(state.page),
      pageSize: String(state.pageSize),
    });

    if (state.category) {
      params.set('category', state.category);
    }

    if (state.search) {
      params.set('search', state.search);
    }

    const response = await fetch(`/api/news?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch news (${response.status})`);
    }

    const payload = await response.json();
    const sortedArticles = sortArticles(payload.data);
    const cards = sortedArticles.map(renderNewsCard).join('');

    if (append) {
      elements.newsGrid.insertAdjacentHTML('beforeend', cards);
      bindSaveButtons(sortedArticles);
    } else {
      renderHeadline(sortedArticles[0]);
      renderSidebars(sortedArticles);
      renderTicker(sortedArticles);
      elements.lastUpdated.textContent = `• Updated ${new Date(payload.updatedAt).toLocaleString()}`;
      elements.newsGrid.innerHTML = cards;
      bindSaveButtons(sortedArticles);
    }

    if (!append && sortedArticles.length === 0) {
      elements.emptyState.classList.remove('hidden');
    }

    updateLoadMore(payload.pagination?.hasMore);
  } catch (error) {
    console.error(error);
    if (!append) {
      renderHeadline(null);
      renderSidebars([]);
      renderTicker([]);
      elements.lastUpdated.textContent = '';
      elements.newsGrid.innerHTML =
        '<p class="rounded-xl bg-rose-100 p-4 text-sm text-rose-700">Unable to load news right now. Try again later.</p>';
    }
    updateLoadMore(false);
  } finally {
    state.loading = false;
    elements.loadMoreBtn.disabled = false;
    hideSkeletons();
  }
}

function debounce(fn, delay = 400) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function registerEvents() {
  elements.searchInput.addEventListener(
    'input',
    debounce((event) => {
      state.search = event.target.value.trim();
      resetResults();
      fetchNews();
    }),
  );

  elements.categorySelect.addEventListener('change', (event) => {
    state.category = event.target.value;
    resetResults();
    fetchNews();
  });

  elements.sortSelect.addEventListener('change', (event) => {
    state.sort = event.target.value;
    resetResults();
    fetchNews();
  });

  elements.loadMoreBtn.addEventListener('click', () => {
    if (!state.hasMore) {
      return;
    }
    state.page += 1;
    fetchNews({ append: true });
  });

  elements.themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'light' : 'dark');
  });
}

initializeTheme();
readSavedArticles();
registerEvents();
fetchNews();
