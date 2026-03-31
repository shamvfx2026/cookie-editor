const axios = require('axios');
const { all, run } = require('../database/db');

const NEWS_API_BASE_URL = 'https://newsapi.org/v2/top-headlines';
const DEFAULT_PAGE_SIZE = 12;
const ALLOWED_CATEGORIES = [
  'business',
  'entertainment',
  'general',
  'health',
  'science',
  'sports',
  'technology',
];

function normalizeArticle(article, category) {
  const sourceName = article?.source?.name || 'Unknown source';
  return {
    externalId: article?.source?.id || article?.url || null,
    category,
    title: article?.title?.trim() || 'Untitled',
    description: article?.description?.trim() || 'No description available.',
    image: article?.urlToImage || null,
    source: sourceName,
    url: article?.url || null,
    publishedAt: article?.publishedAt || new Date().toISOString(),
  };
}

async function fetchNewsByCategory(category) {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    throw new Error('NEWS_API_KEY is missing.');
  }

  const response = await axios.get(NEWS_API_BASE_URL, {
    params: {
      apiKey,
      category,
      country: 'us',
      pageSize: 100,
    },
    timeout: 15000,
  });

  if (response.data?.status !== 'ok') {
    throw new Error(`Unexpected NewsAPI status: ${response.data?.status || 'unknown'}`);
  }

  return (response.data.articles || []).map((article) => normalizeArticle(article, category));
}

async function saveArticles(articles = []) {
  const sql = `
    INSERT OR IGNORE INTO news (
      external_id,
      category,
      title,
      description,
      image,
      source,
      url,
      published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  let inserted = 0;
  for (const article of articles) {
    const result = await run(sql, [
      article.externalId,
      article.category,
      article.title,
      article.description,
      article.image,
      article.source,
      article.url,
      article.publishedAt,
    ]);

    if (result.changes > 0) {
      inserted += 1;
    }
  }

  return inserted;
}

async function syncAllCategories() {
  const syncStartedAt = new Date();
  const summary = {
    startedAt: syncStartedAt.toISOString(),
    finishedAt: null,
    fetched: 0,
    inserted: 0,
    categories: {},
  };

  for (const category of ALLOWED_CATEGORIES) {
    try {
      const articles = await fetchNewsByCategory(category);
      const inserted = await saveArticles(articles);
      summary.categories[category] = {
        fetched: articles.length,
        inserted,
      };
      summary.fetched += articles.length;
      summary.inserted += inserted;
    } catch (error) {
      summary.categories[category] = {
        error: error.message,
      };
      console.error(`[sync] Category ${category} failed:`, error.message);
    }
  }

  summary.finishedAt = new Date().toISOString();
  return summary;
}

async function getNews({ category, search, page = 1, pageSize = DEFAULT_PAGE_SIZE }) {
  const offset = (page - 1) * pageSize;
  const clauses = [];
  const params = [];

  if (category && ALLOWED_CATEGORIES.includes(category)) {
    clauses.push('category = ?');
    params.push(category);
  }

  if (search) {
    clauses.push('(title LIKE ? OR description LIKE ? OR source LIKE ?)');
    const wildcard = `%${search}%`;
    params.push(wildcard, wildcard, wildcard);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = await all(
    `
      SELECT
        id,
        category,
        title,
        description,
        image,
        source,
        url,
        published_at AS publishedAt
      FROM news
      ${whereClause}
      ORDER BY datetime(published_at) DESC
      LIMIT ? OFFSET ?
    `,
    [...params, pageSize, offset],
  );

  const countRows = await all(
    `SELECT COUNT(*) AS total FROM news ${whereClause}`,
    params,
  );

  const total = countRows[0]?.total || 0;

  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: offset + rows.length < total,
    },
  };
}

module.exports = {
  ALLOWED_CATEGORIES,
  DEFAULT_PAGE_SIZE,
  getNews,
  syncAllCategories,
};
