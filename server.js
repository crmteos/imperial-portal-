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
    db.run(`CREATE TABLE IF NOT EXISTS chancellery_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        stardate TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run("INSERT INTO chancellery_records (agent_type, title, content, stardate) VALUES ('archivist', 'Битва при Оріоні (Історія)', 'Імперський флот під командуванням адмірала Соло виграв вирішальну битву проти загарбників 300 років тому.', '5420.4')");
    db.run("INSERT INTO chancellery_records (agent_type, title, content, stardate) VALUES ('reporter', 'Відкриття шахти на Альфі-9', 'Запущено нову шахту з видобутку чистого титану. Очікується приріст видобутку на 15%.', '8452.1')");
    db.run("INSERT INTO chancellery_records (agent_type, title, content, stardate) VALUES ('futurist', 'Прогноз колонізації сектора Х-1', 'Згідно з квантовим моделюванням, сектор Х-1 буде безпечним для заселення протягом наступних 50 років.', '9110.5')");
    db.run("INSERT INTO chancellery_records (agent_type, title, content, stardate) VALUES ('geographer', 'Картографування туманності Андромеди', 'Виявлено три нові екзопланети з високим вмістом рідкої води та кисневою атмосферою.', '8451.8')");
    db.run("INSERT INTO chancellery_records (agent_type, title, content, stardate) VALUES ('scribe', 'Кодекс Вірності громадянина', 'Вірність Імператору — це найвищий прояв розуму. Сумніви породжують слабкість, слабкість породжує зраду.', '8450.0')");
});

app.get('/api/records/:agent_type', (req, res) => {
    const { agent_type } = req.params;
    db.all("SELECT * FROM chancellery_records WHERE agent_type = ? ORDER BY id DESC", [agent_type], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/records', (req, res) => {
    const { agent_type, title, content, stardate } = req.body;
    db.run("INSERT INTO chancellery_records (agent_type, title, content, stardate) VALUES (?, ?, ?, ?)", [agent_type, title, content, stardate], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, agent_type, title, content, stardate });
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
    console.log(`Імперський сервер запущено на порту ${PORT}`);
});
