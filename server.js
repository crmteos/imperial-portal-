const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(':memory:', (err) => {
    if (err) console.error(err.message);
    console.log('Підключено до імперської бази даних.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS decrees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        stardate TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run("INSERT INTO decrees (text, stardate) VALUES ('Про мобілізацію флоту: Всі бойові кораблі в секторі С-3 приведені у стан повної бойової готовності.', '8450.1')");
    db.run("INSERT INTO decrees (text, stardate) VALUES ('Економічна реформа: Податок на видобуток кристалів знижено на 5% для стимулювання торгівлі.', '8448.5')");
});

app.get('/api/decrees', (req, res) => {
    db.all("SELECT * FROM decrees ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/decrees', (req, res) => {
    const { text, stardate } = req.body;
    db.run("INSERT INTO decrees (text, stardate) VALUES (?, ?)", [text, stardate], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, text, stardate });
    });
});

app.get('/api/chat', (req, res) => {
    db.all("SELECT * FROM chat_messages ORDER BY id ASC LIMIT 50", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/chat', (req, res) => {
    const { sender, text } = req.body;
    db.run("INSERT INTO chat_messages (sender, text) VALUES (?, ?)", [sender, text], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, sender, text });
    });
});

app.listen(PORT, () => {
    console.log(`Імперський сервер працює на порту ${PORT}`);
});