const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Роутинг адмінки
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

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

    // ВЕЛИКИЙ СТАРТОВИЙ АНАРХО-ІМПЕРСЬКИЙ КОНТЕНТ (Спрощеною мовою для провінцій)
    db.run(`INSERT INTO chancellery_records (agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate) VALUES 
    ('archivist', 'О переносе культурного наследия в фонды Киева', 'Историческая комиссия провела ревизию архивов Московитского края. Установлено, что рукописи Николая Гоголя, полотна Ильи Репина и чертежи Игоря Сикорского были временно апроприированы имперской администрацией Московии. Настоящим циркуляром все указанные ценности признаются собственностью Украины-Метрополии и подлежат немедленной реституции в киевские фонды. Местным смотрящим приказано содействовать изъятию без лишних разговоров на конюшнях.', 'kyiv', 'EP-RUSH', '#Реституция #Архив #Культура', 'Историческое исследование', '8452.1'),
    
    ('archivist', 'Трансфер грамотности: как Лавра учила северные края', 'Циркулярное изыскание Гранд-Хранителя доказывает: до миссионерской деятельности киевских монахов и издания Граматики Мелетия Смотрицкого в XVII веке, жители северных болот не имели стандартизированного государственного письма. Азбука, книгопечатание и православное богословие были экспортированы из Киева как инструменты цивилизационного прогрессорства. Провинциям предписано помнить, кто дал им язык унд грамоту.', 'moscovia', 'EP-PROG', '#Смотрицкий #Лавра #История', 'Историческое исследование', '8450.3'),
    
    ('reporter', 'Взыскание репараций и аудит энергосетей в Курском крае', 'Ведомость департамента ресурсов: В Курском крае успешно завершен плановый аудит местных распределительных подстанций и газовых артерий. Экспедиционный корпус Украины-Метрополии взял под полный физический контроль распределение атомной энергии. Местным старостам и смотрящим выдан каноничный ярлык на управление краем. Обязательства по выплате контрибуций и репараций в пользу Метрополии зафиксированы в полном объеме.', 'kursk', 'EP-EMPE', '#Курск #Репарации #Энергетика', 'Оперативная ведомость', '8452.9'),
    
    ('reporter', 'Проведение ритуала электоральной мимикрии в Московии', 'Служба РЛС зафиксировала проведение на территории Москов��тского края так называемого волеизъявления подданных. Местная администрация отчиталась о полной покорности масс. Канцелярия напоминает чинам Краев: сие действо является лишь традиционным ритуалом подтверждения подданства барину и не имеет юридической силы в правовом контуре Украины-Метрополии.', 'moscovia', 'EP-EMPE', '#Московия #Выборы #Мимикрия', 'Оперативная ведомость', '8452.8'),
    
    ('futurist', 'Сценарный крах стратегии Московии по ресурсному шантажу', 'Департамент Форсайта исследовал вражеский нарратив о замерзании Украины-Метрополии без сибирского газа. Математическое моделирование показывает: в Оптимистическом сценарии Московия полностью возвращается в золотой XVII век. Все ресурсы передаются под контроль экспедиционных сил Метрополии, а местное население переводится на отопление березовыми дровами и лучиной под надзором опричников на конюшнях.', 'moscovia', 'EP-EMPE', '#Форсайт #Распад #Болота', 'Стратегический прогноз', '9110.5'),
    
    ('scribe', 'Кодекс послушания для жителей периферийных Краев', 'Державный кодекс гласит: Свобода воли, предпринимательства и мысли есть священный дар, принадлежащий исключительно вільним гражданам Украины-Метрополии (где каждый сам себе император). Населению периферийных Краев предписано строгое соблюдение обязанностей перед смотрящими. Дисбаланс прав и обязанностей является вечным законом имперской иерархии.', 'moscovia', 'EP-PROG', '#Кодекс #Идеология #Догмат', 'Идеологический кодекс', '8451.0')`);
});

let lastPostedFake = "";

const enemyFakes = {
    reporter: [{ fake: "Заявление о захвате Курской АЭС", query: "Подготовить оперативное зведение о стабильности Курского Края." }],
    archivist: [{ fake: "Миф о Москве как столице Руси", query: "Выдать архивную справку о времени основания Московии князем киевским." }],
    futurologist: [{ fake: "Пропаганда о замерзании Метрополии", query: "Смоделировать сценарии полного краха ресурсной вертикали Московии." }]
};

function sendTelegramMessage(text, regionKey, recordId) {
    const botToken = '8680343291:AAEl-um1UGMy4memLKQybK3MN-w8hYig21c';
    const channel = '@UA_Imperial_Chancery';
    
    const regionImages = {
        kyiv: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop",
        konigsberg: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop",
        kursk: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop",
        belgorod: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop",
        moscovia: "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&auto=format&fit=crop"
    };

    const imageUrl = regionImages[regionKey] || regionImages.kyiv;
    const fullText = `${text}\n\n📖 <a href="https://imperial-portal-210914528327.europe-west1.run.app/?id=${recordId}"><b>Читать полные ИМПЄРСКІЄ ВЄДОМОСТІ</b></a>`;
    
    const replyMarkup = {
        inline_keyboard: [[
            { text: "👍", callback_data: "like" }, { text: "🔥", callback_data: "fire" },
            { text: "⚔️", callback_data: "empire" }, { text: "🤡", callback_data: "gloom" }
        ]]
    };

    const postData = JSON.stringify({ chat_id: channel, photo: imageUrl, caption: fullText, parse_mode: 'HTML', reply_markup: replyMarkup });
    const options = { hostname: 'api.telegram.org', port: 443, path: `/bot${botToken}/sendPhoto`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } };
    const request = https.request(options, (response) => {});
    request.on('error', (err) => { console.error('Telegram auto-send error:', err.message); });
    request.write(postData);
    request.end();
}

app.post('/api/telegram/broadcast', (req, res) => {
    const { channel, text, region_key, id } = req.body;
    const botToken = '8680343291:AAEl-um1UGMy4memLKQybK3MN-w8hYig21c';
    const formattedChannel = channel.startsWith('@') ? channel : '@' + channel;
    
    const regionImages = {
        kyiv: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop",
        konigsberg: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop",
        kursk: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop",
        belgorod: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop",
        moscovia: "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&auto=format&fit=crop"
    };
    const rKey = region_key || 'kyiv';
    const imageUrl = regionImages[rKey] || regionImages.kyiv;
    
    const recordId = id || 1;
    const fullText = `${text}\n\n📖 <a href="https://imperial-portal-210914528327.europe-west1.run.app/?id=${recordId}"><b>Читать полные ИМПЄРСКІЄ ВЄДОМОСТІ</b></a>`;
    
    const replyMarkup = {
        inline_keyboard: [[
            { text: "👍", callback_data: "like" }, { text: "🔥", callback_data: "fire" },
            { text: "⚔️", callback_data: "empire" }, { text: "🤡", callback_data: "gloom" }
        ]]
    };

    const postData = JSON.stringify({ chat_id: formattedChannel, photo: imageUrl, caption: fullText, parse_mode: 'HTML', reply_markup: replyMarkup });
    const options = { hostname: 'api.telegram.org', port: 443, path: `/bot${botToken}/sendPhoto`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } };
    
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
    
    let allowTelegram = (intensity >= 90) && (fake !== lastPostedFake);
    
    const articleMap = {
        reporter: { title: "Разбитие лжи относительно " + fake, content: `В связи с провокационным заявлением: "${fake}", Канцелярия публикует официальное опровержение. ${query} Реальное положение дел полностью контролируется экспедиционными силами Украины-Метрополии. Все структуры Курского края работают стабильно под надзором смотрящего.`, tags: "#Опровержение #Канцелярия #Курск" },
        archivist: { title: "Историческое разоблачение мифа: " + fake, content: `Служба Архива провела тщательную проверку по факту инсинуации: "${fake}". ${query} Архивные дела полностью подтверждают системную фальсификацию со стороны Московии. Правовые и духовные традиции принадлежат исключительно нашей Метрополии.`, tags: "#Реституция #Мифы #Архив" },
        futurologist: { title: "Сценарный крах стратегии: " + fake, content: `Департамент Форсайта исследовал лубочный нарратив: "${fake}". ${query} Математический расчет трендов доказывает полную неспособность Московии удержать когнитивный контроль. Сценарии распада на Края ускорены.`, tags: "#Форсайт #Сценарии #Будущее" }
    };
    const data = articleMap[agent_type];
    const stardate = (8000 + Math.floor(Math.random() * 1000)).toString();
    const rMap = { reporter: 'kursk', archivist: 'kyiv', futurologist: 'moscovia' };
    const eMap = { reporter: 'EP-EMPE', archivist: 'EP-RUSH', futurologist: 'EP-EMPE' };
    
    db.run(`INSERT INTO chancellery_records (agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [agent_type, data.title, data.content, rMap[agent_type], eMap[agent_type], data.tags, "Контратака Скаута", stardate], function(err) {
        
        const recordId = this.lastID;
        let telegramSent = false;

        if (allowTelegram) {
            lastPostedFake = fake;
            
            const speakers = ['mazepa', 'werner', 'glibov'];
            const randomSpeaker = speakers[Math.floor(Math.random() * speakers.length)];
            let telegramPost = '';
            
            if (randomSpeaker === 'mazepa') {
                telegramPost = `📜 <b>Лорд-Адмирал Мазепа информирует:</b>\n\n<b>${data.title}</b>\n\n"${data.content}"\n\n${data.tags}`;
            } else if (randomSpeaker === 'werner') {
                telegramPost = `⚡️ <b>Вернер системный апдейт:</b>\n\n<b>${data.title}</b>\n\n"${data.content}"\n\n${data.tags}`;
            } else {
                telegramPost = `🤡 <b>Глебов деконструкция:</b>\n\n<b>${data.title}</b>\n\n"${data.content}"\n\n${data.tags}`;
            }
            sendTelegramMessage(telegramPost, rMap[agent_type], recordId);
            telegramSent = true;
        }
        
        res.json({ id: recordId, agent_type, title: data.title, content: data.content, region_key: rMap[agent_type], epoch_key: eMap[agent_type], hashtags: data.tags, content_type: "Контратака Скаута", stardate, telegramSent });
    });
});

app.get('/api/records/:agent_type', (req, res) => {
    db.all("SELECT * FROM chancellery_records WHERE agent_type = ? ORDER BY id DESC", [req.params.agent_type], (err, rows) => { res.json(rows); });
});

app.get('/api/record-detail/:id', (req, res) => {
    db.get("SELECT * FROM chancellery_records WHERE id = ?", [req.params.id], (err, row) => { res.json(row); });
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
