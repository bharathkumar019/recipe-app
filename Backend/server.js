const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

// ---------------------------
// 1️⃣ GET /api/recipes (Paginated & Sorted by rating)
// ---------------------------
app.get('/api/recipes', async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 10;
  let offset = (page - 1) * limit;

  try {
    // Get total count
    const [countResult] = await db.query('SELECT COUNT(*) AS total FROM recipes');
    const total = countResult[0].total;

    // Get paginated recipes sorted by rating descending
    const [rows] = await db.query(
      'SELECT * FROM recipes ORDER BY rating DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    // Parse JSON fields before sending
    const data = rows.map(r => ({
      ...r,
      ingredients: JSON.parse(r.ingredients),
      instructions: JSON.parse(r.instructions),
      nutrients: JSON.parse(r.nutrients)
    }));

    res.json({
      page,
      limit,
      total,
      data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// 2️⃣ GET /api/recipes/search (Filter & Search)
// ---------------------------
app.get('/api/recipes/search', async (req, res) => {
  const { calories, title, cuisine, total_time, rating } = req.query;
  let filters = [];
  let values = [];

  // Title partial match
  if (title) {
    filters.push('title LIKE ?');
    values.push(`%${title}%`);
  }

  // Cuisine exact match
  if (cuisine) {
    filters.push('cuisine = ?');
    values.push(cuisine);
  }

  // Total time filter
  if (total_time) {
    // Example: total_time=<=400 or total_time=>=100
    const operator = total_time.match(/(<=|>=|=|<|>)/)[0];
    const value = total_time.replace(operator, '');
    filters.push(`total_time ${operator} ?`);
    values.push(value);
  }

  // Rating filter
  if (rating) {
    const operator = rating.match(/(<=|>=|=|<|>)/)[0];
    const value = rating.replace(operator, '');
    filters.push(`rating ${operator} ?`);
    values.push(value);
  }

  // Calories filter (from nutrients JSON)
  if (calories) {
    const operator = calories.match(/(<=|>=|=|<|>)/)[0];
    const value = calories.replace(operator, '');
    filters.push(`JSON_EXTRACT(nutrients, '$.calories') ${operator} ?`);
    values.push(value);
  }

  const whereClause = filters.length ? 'WHERE ' + filters.join(' AND ') : '';

  try {
    const [rows] = await db.query(`SELECT * FROM recipes ${whereClause}`, values);

    // Parse JSON fields
    const data = rows.map(r => ({
      ...r,
      ingredients: JSON.parse(r.ingredients),
      instructions: JSON.parse(r.instructions),
      nutrients: JSON.parse(r.nutrients)
    }));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
