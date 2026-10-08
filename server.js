const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(':memory:', (err) => {
    if (err) console.error(err.message);
    console.log('Підключено до структурованої бази даних.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS chancellery_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        region_key TEXT NOT NULL,
        epoch_key TEXT NOT NULL,
        hashtags TEXT NOT NULL,
        content_type TEXT NOT NULL,
        stardate TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Стартовий структурований контент Канцелярії
    db.run(`INSERT INTO chancellery_records (agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate) VALUES 
    ('archivist', 'Битва при Оріоні', 'Імперський флот виграв вирішальну битву проти загарбників 300 років тому.', 'kyiv', 'EP-RUSH', '#Оріон #Перемога #Минуле', 'Історична хроніка', '5420.4'),
    ('reporter', 'Видобуток титану на Альфі-9', 'Запущено нову шахту з видобутку чистого титану. Очікується приріст на 15%.', 'kursk', 'EP-EMPE', '#Титан #Ресурси #Курськ', 'Оперативне зведення', '8452.1'),
    ('scribe', 'Кодекс Вірності громадянина', 'Вірність Імператору — це найвищий прояв розуму. Сумніви народжують зраду.', 'moscovia', 'EP-PROG', '#Кодекс #Вірність #Догмат', 'Ідеологічний догмат', '8450.0')`);
});

// API отримання записів
app.get('/api/records/:agent_type', (req, res) => {
    const { agent_type } = req.params;
    db.all("SELECT * FROM chancellery_records WHERE agent_type = ? ORDER BY id DESC", [agent_type], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API публікації записів з метаданими
app.post('/api/records', (req, res) => {
    const { agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate } = req.body;
    db.run(`INSERT INTO chancellery_records (agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate });
    });
});

// API для ШІ-Інфлюенсерів (чистий зведений фід контенту з усього порталу)
app.get('/api/feed', (req, res) => {
    db.all("SELECT * FROM chancellery_records ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
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
    console.log(`Структурований імперський сервер запущено на порту ${PORT}`);
});
