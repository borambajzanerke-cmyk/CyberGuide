const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'cyberguide.sqlite');
const seedPath = path.join(__dirname, 'seed-data.json');
const schemaPath = path.join(__dirname, 'schema.sql');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => new Promise((resolve, reject) =>
  db.run(sql, params, function (err) { err ? reject(err) : resolve(this); }));
const all = (sql, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
const get = (sql, params = []) => new Promise((resolve, reject) =>
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const i = part.indexOf('=');
    return i < 0 ? [part, ''] : [part.slice(0, i), decodeURIComponent(part.slice(i + 1))];
  }));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createSession(userId, res) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  await run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [hashToken(token), userId, expiresAt]);
  res.setHeader('Set-Cookie', `cyberguide_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`);
}

async function currentUser(req) {
  const token = parseCookies(req.headers.cookie || '').cyberguide_session;
  if (!token) return null;
  const row = await get(
    `SELECT users.id, users.email AS username FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    [hashToken(token), Date.now()]
  );
  return row || null;
}

app.use(express.json({ limit: '10kb' }));

app.get('/api/me', async (req, res) => {
  try {
    const user = await currentUser(req);
    res.json({ authenticated: Boolean(user), user: user ? { id: user.id, username: user.username } : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка проверки сессии' });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Введи корректный email.' });
    }
    if (!password || password.length > 128) {
      return res.status(400).json({ error: 'Введи пароль (не более 128 символов).' });
    }
    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Этот email уже зарегистрирован.' });
    const { salt, hash } = hashPassword(password);
    const result = await run('INSERT INTO users (email, password_hash, password_salt) VALUES (?, ?, ?)', [email, hash, salt]);
    await createSession(result.lastID, res);
    res.status(201).json({ ok: true, username: email });
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Этот email уже зарегистрирован.' });
    console.error(err);
    res.status(500).json({ error: 'Не удалось создать аккаунт.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const user = await get('SELECT id, email, password_hash, password_salt FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль.' });
    const { hash } = hashPassword(password, user.password_salt);
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(user.password_hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'Неверный email или пароль.' });
    }
    await createSession(user.id, res);
    res.json({ ok: true, username: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось выполнить вход.' });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
    const token = parseCookies(req.headers.cookie || '').cyberguide_session;
    if (token) await run('DELETE FROM sessions WHERE token_hash = ?', [hashToken(token)]);
    res.setHeader('Set-Cookie', 'cyberguide_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось выйти из аккаунта.' });
  }
});

async function initializeDatabase() {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await new Promise((resolve, reject) =>
    db.exec(schema, err => err ? reject(err) : resolve()));

  await run('DELETE FROM sessions WHERE expires_at <= ?', [Date.now()]);
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const existingArticles = await get('SELECT COUNT(*) AS count FROM articles');
  const existingQuestions = await get('SELECT COUNT(*) AS count FROM quiz_questions');

  // Существующие статьи не затираем; недостающие вопросы теста добавляем.
  await run('BEGIN TRANSACTION');
  try {
    if (existingArticles.count === 0) {
      for (const article of seed.articles) {
        await run(
          `INSERT INTO articles
           (id, category, image_url, title_ru, title_kz, description_ru, description_kz, content_ru, content_kz)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [article.id, article.category, article.img,
           article.title.ru, article.title.kz, article.desc.ru, article.desc.kz,
           article.text.ru, article.text.kz]
        );
      }
    }

    for (const question of seed.quiz.slice(existingQuestions.count)) {
      const result = await run(
        'INSERT INTO quiz_questions (question_ru, question_kz, correct_option_index) VALUES (?, ?, ?)',
        [question.q.ru, question.q.kz, question.correct]
      );
      for (let i = 0; i < question.opts.ru.length; i++) {
        await run(
          'INSERT INTO quiz_options (question_id, option_index, text_ru, text_kz) VALUES (?, ?, ?, ?)',
          [result.lastID, i, question.opts.ru[i], question.opts.kz[i]]
        );
      }
    }
    await run('COMMIT');
    console.log(`SQLite: материалы сохранены; вопросов в базе: ${Math.max(existingQuestions.count, seed.quiz.length)}.`);
  } catch (err) {
    await run('ROLLBACK');
    throw err;
  }
}

app.get('/api/data', async (req, res) => {
  try {
    const articleRows = await all('SELECT * FROM articles ORDER BY rowid');
    const questionRows = await all('SELECT * FROM quiz_questions ORDER BY id');
    const quiz = [];
    for (const q of questionRows) {
      const options = await all(
        'SELECT option_index, text_ru, text_kz FROM quiz_options WHERE question_id = ? ORDER BY option_index',
        [q.id]
      );
      quiz.push({
        q: { ru: q.question_ru, kz: q.question_kz },
        opts: {
          ru: options.map(o => o.text_ru),
          kz: options.map(o => o.text_kz)
        },
        correct: q.correct_option_index
      });
    }
    res.json({
      articles: articleRows.map(a => ({
        id: a.id, category: a.category, img: a.image_url,
        title: { ru: a.title_ru, kz: a.title_kz },
        desc: { ru: a.description_ru, kz: a.description_kz },
        text: { ru: a.content_ru, kz: a.content_kz }
      })),
      quiz
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка чтения базы данных' });
  }
});

app.use(express.static(__dirname));

initializeDatabase()
  .then(() => app.listen(PORT, () => console.log(`CyberGuide запущен: http://localhost:${PORT}`)))
  .catch(err => { console.error('Не удалось запустить базу:', err); process.exit(1); });
