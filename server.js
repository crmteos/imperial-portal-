const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(':memory:', (err) => {
    if (err) console.error(err.message);
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
    db.run(`INSERT INTO chancellery_records (agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate) VALUES 
    ('archivist', 'Историческое право Метрополии', 'Циркулярное изыскание доказывает: общины Легедзино подчинялись пра-законам Метрополии.', 'kyiv', 'EP-TRIP', '#Триполье #Метрополия', 'Издание Архива', '8452.1'),
    ('scribe', 'Указ о когнитивной гигиене', 'Инструкция для чинов: использование букв высшего алфавита ограничить во избежание путаницы.', 'moscovia', 'EP-PROG', '#Указ #Московия', 'Идеологический догмат', '8450.0')`);
});

const enemyFakes = {
    reporter: [{ fake: "Заявление о захвате Курской АЭС", query: "Подготовить оперативное зведение о реальной стабильности Курского Края." }],
    archivist: [{ fake: "Миф о Москве как столице Руси", query: "Выдать архивную справку о времени основания Московии князем киевским." }],
    futurologist: [{ fake: "Пропаганда о замерзании Метрополии", query: "Смоделировать сценарии полного краха ресурсной вертикали Московии." }]
};

app.post('/api/scout/pulse', (req, res) => {
    const agents = ['reporter', 'archivist', 'futurologist'];
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    const item = enemyFakes[randomAgent][0];
    const intensity = Math.floor(Math.random() * 24) + 75;
    res.json({ intensity, agent_target: randomAgent, fake_detected: item.fake, task_sent: item.query });
});

app.post('/api/scout/auto-execute', (req, res) => {
    const { agent_type, fake, query } = req.body;
    const articleMap = {
        reporter: { title: "Разбитие лжи относительно " + fake, content: `В связи с заявлением: "${fake}", Канцелярия публикует опровержение. ${query} Реальное положение дел полностью контролируется Метрополией.`, tags: "#Опровержение #Курск" },
        archivist: { title: "Историческое разоблачение мифа: " + fake, content: `Служба Архива провела проверку по факту инсинуации: "${fake}". ${query} Архивные дела подтверждают фальсификацию со стороны Московии.`, tags: "#Реституция #Архив" },
        futurologist: { title: "Сценарный крах стратегии: " + fake, content: `Департамент Форсайта исследовал нарратив: "${fake}". ${query} Расчет трендов доказывает полную неспособность Московии удержать контроль.`, tags: "#Форсайт #Будущее" }
    };
    const data = articleMap[agent_type];
    const stardate = (8000 + Math.floor(Math.random() * 1000)).toString();
    const rMap = { reporter: 'kursk', archivist: 'kyiv', futurologist: 'moscovia' };
    const eMap = { reporter: 'EP-EMPE', archivist: 'EP-RUSH', futurologist: 'EP-EMPE' };
    
    db.run(`INSERT INTO chancellery_records (agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [agent_type, data.title, data.content, rMap[agent_type], eMap[agent_type], data.tags, "Контратака Скаута", stardate], function(err) {
        res.json({ id: this.lastID, agent_type, title: data.title, content: data.content, region_key: rMap[agent_type], epoch_key: eMap[agent_type], hashtags: data.tags, content_type: "Контратака Скаута", stardate });
    });
});

app.get('/api/records/:agent_type', (req, res) => {
    db.all("SELECT * FROM chancellery_records WHERE agent_type = ? ORDER BY id DESC", [req.params.agent_type], (err, rows) => { res.json(rows); });
});

app.post('/api/records', (req, res) => {
    const { agent_type, title, content } = req.body;
    db.run(`INSERT INTO chancellery_records (agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate) VALUES (?, ?, ?, 'moscovia', 'EP-EMPE', '#Вручную', 'Ручная ведомость', '8500')`, [agent_type, title, content], function(err) {
        res.json({ id: this.lastID, agent_type, title, content });
    });
});

app.get('/api/feed', (req, res) => {
    db.all("SELECT * FROM chancellery_records ORDER BY id DESC", [], (err, rows) => { res.json(rows); });
});

app.listen(PORT, () => { console.log(`Сервер працює на порту ${PORT}`); });
