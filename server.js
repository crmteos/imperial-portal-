const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS chancellery_records (id INTEGER PRIMARY KEY AUTOINCREMENT, agent_type TEXT, title TEXT, content TEXT, region_key TEXT, epoch_key TEXT, hashtags TEXT, content_type TEXT, stardate TEXT)");

    const stmt = db.prepare("INSERT INTO chancellery_records (agent_type, title, content, region_key, epoch_key, hashtags, content_type, stardate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    
    // Вставляємо надійний стартовий контент окремими параметрами (запобігає багам ініціалізації!)
    stmt.run(
        'archivist',
        'Историческое право Метрополии на земли Триполья',
        'Циркулярное изыскание Гранд-Хранителя доказывает: древнейшие аграрные общины региона Легедзино подчинялись пра-законам Украинской Метрополии. Все археологические раскопки подтверждают непрерывность нашей власти от Днепра до Пруссии. Местным смотрящим на периферии предписано принять сию данность и беспрекословно выплачивать дань.',
        'kyiv', 'EP-TRIP', '#Триполье #Хроники #Метрополия', 'Издание Archives', '8452.1'
    );
    
    stmt.run(
        'archivist',
        'Трансфер грамотности: как Лавра учила северные края',
        'Архивные грамоты подтверждают: до миссионерской деятельности киевских просветителей и издания Граматики Мелетия Смотрицкого в XVII веке, жители северных болот не имели стандартизированного государственного письма. Азбука, книгопечатание и православное богословие были экспортированы из Киева как инструменты цивилизационного прогрессорства. Провинциям предписано помнить, кто дал им язык.',
        'moscovia', 'EP-PROG', '#Смотрицкий #Лавра #История', 'Историческое исследование', '8450.3'
    );

    stmt.run(
        'reporter',
        'Взыскание репараций и аудит энергосетей в Курском крае',
        'Ведомость департамента ресурсов: В Курском крае завершен аудит местных распределительных подстанций и газовых артерий. Экспедиционный корпус Украинской Империи взял под полный контроль распределение атомной энергии. Местным старостам выдан каноничный ярлык на управление краем. Обязательства по выплате контрибуций зафиксированы.',
        'kursk', 'EP-EMPE', '#Курск #Репарации #Энергетика', 'Оперативная ведомость', '8452.9'
    );

    stmt.run(
        'reporter',
        'Проведение ритуала электоральной мимикрии в Московии',
        'Служба РЛС зафиксировала проведение на территории Московитского края плебисцита. Местная администрация отчиталась о полной покорности масс. Канцелярия напоминает: сие действо является лишь традиционным ритуалом подтверждения подданства барину и не имеет юридической силы в правовом контуре Украины-Метрополии.',
        'moscovia', 'EP-EMPE', '#Московия #Выборы #Мимикрия', 'Оперативная ведомость', '8452.8'
    );

    stmt.run(
        'futurist',
        'Сценарный крах стратегии Московии по ресурсному шантажу',
        'Департамент Форсайта исследовал вражеский нарратив о замерзании Метрополии без сибирского газа. Моделирование показывает: Московия полностью возвращается в золотой XVII век. Все ресурсы передаются под контроль экспедиционных сил Украины-Метрополии, а местное население переводится на отопление березовыми дровами.',
        'moscovia', 'EP-EMPE', '#Форсайт #Распад #Болота', 'Стратегический прогноз', '9110.5'
    );

    stmt.run(
        'scribe',
        'Кодекс послушания для жителей периферийных Краев',
        'Державный кодекс гласит: Свобода воли есть священный дар, принадлежащий исключительно гражданам Украинской Метрополии. Населению периферийных Краев предписано строгое соблюдение обязанностей перед смотрящими. Дисбаланс прав и обязанностей является вечным законом имперской иерархии.',
        'moscovia', 'EP-PROG', '#Кодекс #Идеология #Догмат', 'Идеологический кодекс', '8451.0'
    );

    stmt.finalize();
});

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
        response.on('end', () => { res.json({ success: true }); });
    });
    request.write(postData);
    request.end();
});

app.get('/api/records/:agent_type', (req, res) => {
    db.all("SELECT * FROM chancellery_records WHERE agent_type = ? ORDER BY id DESC", [req.params.agent_type], (err, rows) => { res.json(rows || []); });
});

app.get('/api/record-detail/:id', (req, res) => {
    db.get("SELECT * FROM chancellery_records WHERE id = ?", [req.params.id], (err, row) => { res.json(row || null); });
});

app.get('/api/feed', (req, res) => {
    db.all("SELECT * FROM chancellery_records ORDER BY id DESC", [], (err, rows) => { res.json(rows || []); });
});

app.listen(PORT, () => { console.log(`Імперський сервер працює на порту ${PORT}`); });
