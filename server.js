const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const multer = require('multer');
const { marked } = require('marked');

const app = express();
const db = new sqlite3.Database('db.sqlite');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use(session({
  secret: 'forum-secret',
  resave: false,
  saveUninitialized: false
}));

// ---------- DATABASE ----------
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      avatar TEXT,
      role TEXT DEFAULT 'user'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY,
      author INTEGER,
      title TEXT,
      body TEXT,
      created DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS replies (
      id INTEGER PRIMARY KEY,
      post INTEGER,
      author INTEGER,
      body TEXT,
      created DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// ---------- UPLOADS ----------
const postUpload = multer({ dest: 'uploads/files/' });
const avatarUpload = multer({ dest: 'uploads/avatars/' });

// ---------- AUTH ----------
app.post('/register', async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  db.run(
    `INSERT INTO users (username,password) VALUES (?,?)`,
    [req.body.username, hash],
    err => err ? res.sendStatus(400) : res.sendStatus(200)
  );
});

app.post('/login', (req, res) => {
  db.get(
    `SELECT * FROM users WHERE username=?`,
    [req.body.username],
    async (err, user) => {
      if (!user || !(await bcrypt.compare(req.body.password, user.password)))
        return res.sendStatus(403);

      req.session.user = user;
      res.json({ username: user.username, role: user.role, avatar: user.avatar });
    }
  );
});

// ---------- POSTS ----------
app.post('/post', postUpload.single('file'), (req, res) => {
  if (!req.session.user) return res.sendStatus(401);

  db.run(
    `INSERT INTO posts (author,title,body) VALUES (?,?,?)`,
    [req.session.user.id, req.body.title, req.body.body],
    () => res.sendStatus(200)
  );
});

app.get('/posts', (req, res) => {
  db.all(`
    SELECT posts.*, users.username, users.avatar
    FROM posts
    JOIN users ON users.id = posts.author
    ORDER BY created DESC
  `, (err, rows) => {
    rows.forEach(p => p.body = marked.parse(p.body));
    res.json(rows);
  });
});

// ---------- ADMIN DELETE ----------
app.delete('/post/:id', (req, res) => {
  if (req.session.user?.role !== 'admin') return res.sendStatus(403);
  db.run(`DELETE FROM posts WHERE id=?`, [req.params.id]);
  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log('Forum running at http://localhost:3000');
});
