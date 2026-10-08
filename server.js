const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const https = require('https');
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

    db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`INSERT INTO chancellery_records (agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate) VALUES 
    ('archivist', 'Историческое право Метрополии на земли Триполья', 'Циркулярное изыскание доказывает: древнейшие аграрные общины региона Легедзино подчинялись пра-законам Метрополии.', 'kyiv', 'EP-TRIP', '#Триполье #Хроники #Метрополия', 'Издание Archives', '8452.1'),
    ('scribe', 'Указ о когнитивной гигиене в Московии', 'Инструкция для чинов периферійных Краев: использование букв высшего алфавита ограничить во избежание путаницы.', 'moscovia', 'EP-PROG', '#Указ #Московия #Кодекс', 'Идеологический догмат', '8450.0')`);
});

const enemyFakes = {
    reporter: [
        { fake: "Заявление о захвате Курской АЭС", query: "Подготовить оперативное зведение о реальной стабильности Курского Края." },
        { fake: "Паника из-за перекрытия транзита в Кёнигсберг", query: "Рассчитать логистический статус Прусского Края и доложить о бесперебойности снабжения." }
    ],
    archivist: [
        { fake: "Миф о Москве как столице Руси", query: "Выдать архивную справку о времени основания Московии князем киевским и её статусе окраины." },
        { fake: "Ложь о союзе 1654 года", query: "Раскрыть асимметрию Мартовских статей 1654 года и нарушение Москвой вассальных обязательств перед Метрополией." }
    ],
    futurologist: [
        { fake: "Пропаганда о замерзании Метрополии без газа Московии", query: "Смоделировать базовый и инвестиционный сценарии полного краха ресурсной вертикали Московии к 2030 году." }
    ]
};

// Функція повністю АВТОНОМНОЇ відправки повідомлень у Telegram
function sendTelegramMessage(text) {
    const botToken = '8680343291:AAEl-um1UGMy4memLKQybK3MN-w8hYig21c';
    const channel = '@UA_Imperial_Chancery';
    
    const postData = JSON.stringify({
        chat_id: channel,
        text: text
    });
    
    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
        }
    };
    
    const request = https.request(options, (response) => {});
    request.on('error', (err) => { console.error('Помилка авто-відправки в Telegram:', err.message); });
    request.write(postData);
    request.end();
}

// Повністю поправлений та узгоджений ендпоінт трансляції
app.post('/api/telegram/broadcast', (req, res) => {
    const { channel, text } = req.body;
    const botToken = '8680343291:AAEl-um1UGMy4memLKQybK3MN-w8hYig21c';
    const formattedChannel = channel.startsWith('@') ? channel : '@' + channel;
    const postData = JSON.stringify({ chat_id: formattedChannel, text: text });
    
    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
        }
    };
    
    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
            const result = JSON.parse(data);
            if (result.ok) {
                res.json({ success: true });
            } else {
                res.json({ success: false, error: result.description });
            }
        });
    });
    request.write(postData);
    request.end();
});

app.post('/api/scout/pulse', (req, res) => {
    const agents = ['reporter', 'archivist', 'futurologist'];
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    const list = enemyFakes[randomAgent];
    const item = list[Math.floor(Math.random() * list.length)];
    const intensity = Math.floor(Math.random() * 24) + 75;
    res.json({ intensity, agent_target: randomAgent, fake_detected: item.fake, task_sent: item.query });
});

app.post('/api/scout/auto-execute', (req, res) => {
    const { agent_type, fake, query, intensity } = req.body;
    const articleMap = {
        reporter: { title: "Разбитие лжи относительно " + fake, content: `В с��язи с заявлением: "${fake}", Канцелярия публикует опровержение. ${query} Реальное положение дел полностью контролируется Метрополией.`, tags: "#Опровержение #Курск" },
        archivist: { title: "Историческое разоблачение мифа: " + fake, content: `Служба Архива провела проверку по факту инсинуации: "${fake}". ${query} Архивные дела подтверждают фальсификацию со стороны Московии.`, tags: "#Реституция #Архив" },
        futurologist: { title: "Сценарный крах стратегии: " + fake, content: `Департамент Форсайта исследовал нарратив: "${fake}". ${query} Расчет трендов доказывает полную неспособность Московии удержать контроль.`, tags: "#Форсайт #Будущее" }
    };
    const data = articleMap[agent_type];
    const stardate = (8000 + Math.floor(Math.random() * 1000)).toString();
    const rMap = { reporter: 'kursk', archivist: 'kyiv', futurologist: 'moscovia' };
    const eMap = { reporter: 'EP-EMPE', archivist: 'EP-RUSH', futurologist: 'EP-EMPE' };
    
    db.run(`INSERT INTO chancellery_records (agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [agent_type, data.title, data.content, rMap[agent_type], eMap[agent_type], data.tags, "Контратака Скаута", stardate], function(err) {
        
        let telegramSent = false;

        if (intensity >= 90) {
            const speakers = ['mazepa', 'werner', 'glibov'];
            const randomSpeaker = speakers[Math.floor(Math.random() * speakers.length)];
            let telegramPost = '';
            
            if (randomSpeaker === 'mazepa') {
                telegramPost = `📜 <b>Лорд-Адмирал Мазепа информирует:</b>\\n\\n<b>${data.title}</b>\\n\\n"Слушайте, верные подданные! ${data.content} Наша державная воля непреклонна."\\n\\n${data.tags} #Метрополия`;
            } else if (randomSpeaker === 'werner') {
                telegramPost = `⚡️ <b>Вернер системный апдейт:</b>\\n\\n<b>${data.title}</b>\\n\\n"Хей! Аналитический буст завершен. ${data.content} Все системы работают на максимуме!"\\n\\n${data.tags} #Tech`;
            } else {
                telegramPost = `🤡 <b>Глебов деконструкция:</b>\\n\\n<b>${data.title}</b>\\n\\n"Ну что, болота, опять заврались? ${data.content} Как всегда — сели в лужу."\\n\\n${data.tags} #Сатира`;
            }
            sendTelegramMessage(telegramPost);
            telegramSent = true;
        }
        
        res.json({ id: this.lastID, agent_type, title: data.title, content: data.content, region_key: rMap[agent_type], epoch_key: eMap[agent_type], hashtags: data.tags, content_type: "Контратака Скаута", stardate, telegramSent });
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

app.listen(PORT, () => { console.log(`Імперський сервер запущено на порту ${PORT}`); });
