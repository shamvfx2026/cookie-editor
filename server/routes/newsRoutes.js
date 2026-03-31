const express = require('express');
const { listNews } = require('../controllers/newsController');

const router = express.Router();

router.get('/news', listNews);

module.exports = router;
