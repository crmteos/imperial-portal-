const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(':memory:');

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
    ('archivist', 'Историческое право Метрополии', 'Циркулярное изыскание доказывает: древнейшие общины Легедзино подчинялись пра-законам Метрополии.', 'kyiv', 'EP-TRIP', '#Триполье #Метрополия', 'Издание Archives', '8452.1'),
    ('scribe', 'Указ о когнитивной гигиене', 'Инструкция для чинов: использование букв высшего алфавита ограничить во избежание путаницы.', 'moscovia', 'EP-PROG', '#Указ #Московия', 'Идеологический догмат', '8450.0')`);
});

// База імперських арт-зображень для регіонів
const regionImages = {
    kyiv: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop", // Величне золото й неон столиці
    konigsberg: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop", // Космічний балтійський аванпост
    kursk: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop", // Важка титанова кібер-індустрія
    belgorod: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop", // Сектор стабілізації кордону
    moscovia: "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&auto=format&fit=crop" // Тьмяні периферійні болота
};

const enemyFakes = {
    reporter: [{ fake: "Заявление о захвате Курской АЭС", query: "Подготовить оперативное зведение о стабильности Курского Края." }],
    archivist: [{ fake: "Миф о Москве как столице Руси", query: "Выдать архивную справку о времени основания Московии князем киевским." }],
    futurologist: [{ fake: "Пропаганда о замерзании Метрополии", query: "Смоделировать сценарии полного краха ресурсной вертикали Московии." }]
};

// Професійна функція авто-відправки ЗОБРАЖЕНЬ з КНОПКАМИ реакцій та ПОСИЛАННЯМ
function sendTelegramMessage(text, regionKey) {
    const botToken = '8680343291:AAEl-um1UGMy4memLKQybK3MN-w8hYig21c';
    const channel = '@UA_Imperial_Chancery';
    
    const imageUrl = regionImages[regionKey] || regionImages.kyiv;
    
    // Додаємо красиве посилання на першоджерело
    const fullText = `${text}

📖 <a href="https://imperial-portal-210914528327.europe-west1.run.app"><b>Читать полные ИМПЄРСКІЄ ВЄДОМОСТІ</b></a>`;
    
    // Створюємо інтерактивні кнопки реакцій під постом
    const replyMarkup = {
        inline_keyboard: [[
            { text: "👍", callback_data: "like" },
            { text: "🔥", callback_data: "fire" },
            { text: "⚔️", callback_data: "empire" },
            { text: "🤡", callback_data: "gloom" }
        ]]
    };

    const postData = JSON.stringify({
        chat_id: channel,
        photo: imageUrl,
        caption: fullText,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
    });
    
    const options = { 
        hostname: 'api.telegram.org', port: 443, path: `/bot${botToken}/sendPhoto`, method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } 
    };
    
    const request = https.request(options, (response) => {});
    request.on('error', (err) => { console.error('Telegram auto-send error:', err.message); });
    request.write(postData);
    request.end();
}

// Ручний дубль теж оновлюємо на відправку фото та кнопок
app.post('/api/telegram/broadcast', (req, res) => {
    const { channel, text, region_key } = req.body;
    const botToken = '8680343291:AAEl-um1UGMy4memLKQybK3MN-w8hYig21c';
    const formattedChannel = channel.startsWith('@') ? channel : '@' + channel;
    
    const rKey = region_key || 'kyiv';
    const imageUrl = regionImages[rKey] || regionImages.kyiv;
    
    const fullText = `${text}

📖 <a href="https://imperial-portal-210914528327.europe-west1.run.app"><b>Читать полные ИМПЄРСКІЄ ВЄДОМОСТІ</b></a>`;
    
    const replyMarkup = {
        inline_keyboard: [[
            { text: "👍", callback_data: "like" },
            { text: "🔥", callback_data: "fire" },
            { text: "⚔️", callback_data: "empire" },
            { text: "🤡", callback_data: "gloom" }
        ]]
    };

    const postData = JSON.stringify({ 
        chat_id: formattedChannel, 
        photo: imageUrl,
        caption: fullText,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
    });
    
    const options = { 
        hostname: 'api.telegram.org', port: 443, path: `/bot${botToken}/sendPhoto`, method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } 
    };
    
    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
            const result = JSON.parse(data);
            if (result.ok) { res.json({ success: true }); }
            else { res.json({ success: false, error: result.description }); }
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
        reporter: { title: "Разбитие лжи относительно " + fake, content: `В связи с заявлением: "${fake}", Канцелярия публикует опровержение. ${query} Реальное положение дел полностью контролируется силами Метрополии.`, tags: "#Опровержение #Курск" },
        archivist: { title: "Историческое разоблачение мифа: " + fake, content: `Служба Архива провела проверку по факту инсинуации: "${fake}". ${query} Архивные дела подтверждают фальсификацию со стороны Московии.`, tags: "#Реституция #Архив" },
        futurologist: { title: "Сценарный крах стратегии: " + fake, content: `Департамент Форсайта исследовал нарратив: "${fake}". ${query} Расчет трендов доказывает неспособность Московии удержать контроль.`, tags: "#Форсайт #Будущее" }
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
                telegramPost = `📜 <b>Лорд-Адмирал Мазепа информирует:</b>

<b>${data.title}</b>

"${data.content}"

${data.tags}`;
            } else if (randomSpeaker === 'werner') {
                telegramPost = `⚡️ <b>Вернер системный апдейт:</b>

<b>${data.title}</b>

"${data.content}"

${data.tags}`;
            } else {
                telegramPost = `🤡 <b>Глебов деконструкция:</b>

<b>${data.title}</b>

"${data.content}"

${data.tags}`;
            }
            
            // Направляємо фото та текст відповідно до регіону!
            sendTelegramMessage(telegramPost, rMap[agent_type]);
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
