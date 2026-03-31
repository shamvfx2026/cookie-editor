const { ALLOWED_CATEGORIES, DEFAULT_PAGE_SIZE, getNews } = require('../services/newsService');

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

async function listNews(req, res, next) {
  try {
    const page = parsePositiveInteger(req.query.page, 1);
    const pageSize = Math.min(parsePositiveInteger(req.query.pageSize, DEFAULT_PAGE_SIZE), 50);
    const category = req.query.category;
    const search = req.query.search?.trim() || '';

    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      res.status(400).json({
        error: 'Invalid category',
        allowedCategories: ALLOWED_CATEGORIES,
      });
      return;
    }

    const result = await getNews({ category, search, page, pageSize });

    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({
      ...result,
      filters: {
        category: category || null,
        search,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listNews,
};
