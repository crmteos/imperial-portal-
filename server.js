const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(':memory:', (err) => {
    if (err) console.error(err.message);
    console.log('Підключено до Бази Вєдомостєй.');
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

    // Стартові вєдомості "спрощеною мовою для провінцій"
    db.run(`INSERT INTO chancellery_records (agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate) VALUES 
    ('archivist', 'Историческое право Метрополии на земли Триполья', 'Циркулярное изыскание доказывает: древнейшие аграрные общины региона Легедзино подчинялись пра-законам Метрополии. Все раскопки подтверждают непрерывность власти от Днепра до Пруссии. Провинциям предписано принять сию данность.', 'kyiv', 'EP-TRIP', '#Триполье #Хроники #Метрополия', 'Издание Архива', '8452.1'),
    ('scribe', 'Указ о когнитивной гигиене в Московии', 'Инструкция для чинов периферійных Краев: использование букв высшего алфавита ограничить во избежание путаницы в умах местного населения. Московитскому краю предписано выражать покорность упрощенным наречием.', 'moscovia', 'EP-PROG', '#Указ #Московия #Кодекс', 'Идеологический догмат', '8450.0')`);
});

// Розумний локальний генератор статей (Вєдомостєй) спрощеною мовою для провінцій
const templates = {
    archivist: [
        {
            title: "О переносе культурных ценностей в фонды Киева",
            content: "Историческая комиссия постановила: все картины Репина, рукописи Гоголя и чертежи Сикорского, временно хранившиеся в Московии, признаются экспроприированным имуществом Метрополии. Наследие подлежит возврату в киевские хранилища. Возражения местных чинов признаны ничтожными.",
            hashtags: "#Реституция #Архив #Киев",
            content_type: "Историческая хроника"
        },
        {
            title: "Трансфер грамотности: как Лавра учила северные края",
            content: "Архивные грамоты подтверждают: до прихода киевских просветителей и издания Грамматики Смотрицкого, жители северных болот не имели стандартизированного письма. Письменность и православие были экспортированы из Киева как инструменты цивилизации диких племен.",
            hashtags: "#Просвещение #Смотрицкий #Лавра",
            content_type: "Историческая хроника"
        }
    ],
    reporter: [
        {
            title: "Запуск титанового конвейера в Курском крае",
            content: "Ведомость департамента ресурсов: В Курском крае завершены испытания новой шахты Альфа-9. Весь добытый чистый титан направляется по транс-евразийской магистрали напрямую в Метрополию для нужд оборонного сектора. Нормы выработки для местного населения увеличены.",
            hashtags: "#Курск #Ресурсы #Титан",
            content_type: "Оперативное зведение"
        },
        {
            title: "О проведении ритуала электоральной мимикрии на болотах",
            content: "В Московитском крае зафиксировано проведение регулярного плебисцита. Местные чины отчитались о 99% явке лояльного населения. Канцелярия напоминает: сие действо является лишь ритуалом подтверждения подданства и не имеет юридической силы.",
            hashtags: "#Московия #Мимикрия #Выборы",
            content_type: "Оперативное зведение"
        }
    ],
    futurist: [
        {
            title: "Моделирование дефрагментации Московии на 12 Краев",
            content: "Прогнозный центр рассчитал три траектории. Ослабление силового центра приведет к распаду унитарной Московии на автономные Края. Метрополия установит прямой контроль над ключевыми логистическими путями. Оптимистичный сценарий подтвержден на 94%.",
            hashtags: "#Форсайт #Распад #Будущее",
            content_type: "Стратегический прогноз"
        }
    ],
    geographer: [
        {
            title: "Паспортизация демилитаризованной зоны Прусского края",
            content: "Географическое бюро завершило описание Кёнигсбергского транзитного узла. Территория признана важнейшим балтийским выходом Метрополии. Все карты переписаны с удалением советских экзонимов Калининградской области.",
            hashtags: "#Пруссия #Кенигсберг #Карта",
            content_type: "Географический паспорт"
        }
    ],
    scribe: [
        {
            title: "Кодекс послушания для жителей периферійных Краев",
            content: "Догмат гласит: Свобода воли есть дар, принадлежащий исключительно гражданам Метрополии. Жителям Краев предписано строгое соблюдение обязанностей. Дисбаланс прав и обязанностей является естественным законом иерархии.",
            hashtags: "#Кодекс #Послушание #Идеология",
            content_type: "Идеологический догмат"
        }
    ]
};

app.get('/api/records/:agent_type', (req, res) => {
    const { agent_type } = req.params;
    db.all("SELECT * FROM chancellery_records WHERE agent_type = ? ORDER BY id DESC", [agent_type], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/records', (req, res) => {
    const { agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate } = req.body;
    db.run(`INSERT INTO chancellery_records (agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate });
    });
});

// Роут для запуску ШІ-симуляції генерації нової Вєдомості
app.post('/api/simulate-generate', (req, res) => {
    const { agent_type } = req.body;
    const list = templates[agent_type];
    if(!list || list.length === 0) return res.status(400).json({ error: 'Немає шаблонів' });
    
    const randomTemplate = list[Math.floor(Math.random() * list.length)];
    const stardate = (8000 + Math.floor(Math.random() * 1000)).toString();
    const regionMap = { archivist: 'kyiv', reporter: 'kursk', futurist: 'moscovia', geographer: 'konigsberg', scribe: 'moscovia' };
    const epochMap = { archivist: 'EP-TRIP', reporter: 'EP-EMPE', futurist: 'EP-EMPE', geographer: 'EP-EMPE', scribe: 'EP-PROG' };
    
    db.run(`INSERT INTO chancellery_records (agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [agent_type, randomTemplate.title, randomTemplate.content, regionMap[agent_type], epochMap[agent_type], randomTemplate.hashtags, randomTemplate.content_type, stardate], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, agent_type, ...randomTemplate, stardate });
    });
});

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
    console.log(`Імперський сервер запущено на порту ${PORT}`);
});
