const state = {
  page: 1,
  pageSize: 12,
  category: '',
  search: '',
  loading: false,
  hasMore: true,
};

const elements = {
  searchInput: document.getElementById('searchInput'),
  categorySelect: document.getElementById('categorySelect'),
  newsGrid: document.getElementById('newsGrid'),
  skeletonGrid: document.getElementById('skeletonGrid'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  emptyState: document.getElementById('emptyState'),
  themeToggle: document.getElementById('themeToggle'),
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

function renderNewsCard(article) {
  const imageUrl = article.image || 'https://placehold.co/600x400?text=No+Image';
  const publishedDate = new Date(article.publishedAt).toLocaleString();

  return `
    <article class="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(article.title)}" class="h-44 w-full object-cover" loading="lazy" referrerpolicy="no-referrer" />
      <div class="space-y-3 p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400">${escapeHtml(article.category)}</p>
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
    const cards = payload.data.map(renderNewsCard).join('');

    if (append) {
      elements.newsGrid.insertAdjacentHTML('beforeend', cards);
    } else {
      elements.newsGrid.innerHTML = cards;
    }

    if (!append && payload.data.length === 0) {
      elements.emptyState.classList.remove('hidden');
    }

    updateLoadMore(payload.pagination?.hasMore);
  } catch (error) {
    console.error(error);
    if (!append) {
      elements.newsGrid.innerHTML = '<p class="rounded-xl bg-rose-100 p-4 text-sm text-rose-700">Unable to load news right now. Try again later.</p>';
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
registerEvents();
fetchNews();
