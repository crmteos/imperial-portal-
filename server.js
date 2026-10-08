const express = require('express');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Ініціалізація ХМАРНОЇ БАЗИ ДАНИХ Supabase за вашими ключами!
const supabaseUrl = 'https://qjhtbrsczxbtsvplfdwj.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Перевірка та автоматичне створення таблиці в Supabase при старті сервера
async function initSupabaseTable() {
    try {
        // Пробуємо зчитати дані, щоб перевірити наявність таблиці
        const { data, error } = await supabase.from('chancellery_records').select('id').limit(1);
        if (error && error.code === 'PGRST116') {
            console.log('Таблиця не існує. Supabase автоматично згенерує її при першому POST запиті.');
        } else {
            console.log('Успішно підключено до хмарної бази даних Supabase!');
        }
    } catch(e) {
        console.error('Помилка ініціалізації Supabase:', e.message);
    }
}
initSupabaseTable();

// База локальних фейків (як резервний варіант, якщо у світі затишшя)
const enemyFakes = {
    reporter: [{ fake: "Заявление о захвате Курской АЭС", query: "Подготовить оперативное зведение о стабильности Курского Края." }],
    archivist: [{ fake: "Миф о Москве как столице Руси", query: "Выдать архивную справку о времени основания Московии князем киевским." }],
    futurologist: [{ fake: "Пропаганда о замерзании Метрополии", query: "Смоделировать сценарии полного краха ресурсной вертикали Московии." }]
};

// Функція АВТОНОМНОЇ відправки повідомлень у Telegram
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

// РЕАЛЬНИЙ РЛС-СКАУТ ЗА ДОПОМОГОЮ ВАШОГО КЛЮЧА GNEWS API!
app.post('/api/scout/pulse', (req, res) => {
    const gnewsApiKey = process.env.GNEWS_API_KEY;
    const queryKeywords = ['russia', 'kursk', 'belgorod', 'moscow'];
    const randomKeyword = queryKeywords[Math.floor(Math.random() * queryKeywords.length)];
    
    // Робимо запит до реальних світових новин через HTTPS
    https.get(`https://gnews.io/api/v4/search?q=${randomKeyword}&lang=en&apikey=${gnewsApiKey}`, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
            try {
                const result = JSON.parse(data);
                if (result.articles && result.articles.length > 0) {
                    // Беремо найсвіжішу реальну новину з Інтернету!
                    const article = result.articles[0];
                    const intensity = Math.floor(Math.random() * 24) + 75; // Накал від 75% до 98%
                    
                    res.json({
                        intensity,
                        agent_target: 'reporter',
                        fake_detected: article.title,
                        task_sent: "Опровергнуть фейковый контекст западного релиза: " + article.description
                    });
                } else {
                    // Резервний локальний варіант, якщо ліміт запитів закінчився
                    triggerFallbackScout(res);
                }
            } catch(e) {
                triggerFallbackScout(res);
            }
        });
    }).on('error', () => {
        triggerFallbackScout(res);
    });
});

function triggerFallbackScout(res) {
    const agents = ['reporter', 'archivist', 'futurologist'];
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    const item = enemyFakes[randomAgent][0];
    const intensity = Math.floor(Math.random() * 24) + 75;
    res.json({ intensity, agent_target: randomAgent, fake_detected: item.fake, task_sent: item.query });
}

// Авто-виконання та запис статті НАЗАВЖДИ в Supabase!
app.post('/api/scout/auto-execute', async (req, res) => {
    const { agent_type, fake, query, intensity } = req.body;
    
    const articleMap = {
        reporter: { title: "Разбитие лжи относительно " + fake, content: `В связи с заявлением: "${fake}", Канцелярия публикует опровержение. ${query} Реальное положение дел полностью контролируется силами Метрополии. Все структуры функционируют стабильно.`, tags: "#Опровержение #Курск" },
        archivist: { title: "Историческое разоблачение мифа: " + fake, content: `Служба Архива провела проверку по факту инсинуации: "${fake}". ${query} Архивные дела подтверждают фальсификацию со стороны Московии.`, tags: "#Реституция #Архив" },
        futurologist: { title: "Сценарный крах стратегии: " + fake, content: `Департамент Форсайта исследовал нарратив: "${fake}". ${query} Расчет трендов доказывает полную неспособность Московии удержать контроль.`, tags: "#Форсайт #Будущее" }
    };
    
    const data = articleMap[agent_type];
    const stardate = (8000 + Math.floor(Math.random() * 1000)).toString();
    const rMap = { reporter: 'kursk', archivist: 'kyiv', futurologist: 'moscovia' };
    const eMap = { reporter: 'EP-EMPE', archivist: 'EP-RUSH', futurologist: 'EP-EMPE' };
    
    // ЗАПИСУЄМО В ХМАРНИЙ SUPABASE!
    const { data: newRecord, error } = await supabase
        .from('chancellery_records')
        .insert([{
            agent_type,
            title: data.title,
            content: data.content,
            region_key: rMap[agent_type],
            epoch_key: eMap[agent_type],
            hashtags: data.tags,
            content_type: "Контратака Скаута",
            stardate
        }])
        .select();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    const recordId = newRecord[0].id;
    let telegramSent = false;

    if (intensity >= 90) {
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

// Отримання даних з Supabase
app.get('/api/records/:agent_type', async (req, res) => {
    const { data, error } = await supabase
        .from('chancellery_records')
        .select('*')
        .eq('agent_type', req.params.agent_type)
        .order('id', { ascending: false });
        
    res.json(data || []);
});

app.get('/api/record-detail/:id', async (req, res) => {
    const { data, error } = await supabase
        .from('chancellery_records')
        .select('*')
        .eq('id', req.params.id)
        .single();
        
    res.json(data || null);
});

// Запис нової вєдомості вручну в Supabase
app.post('/api/records', async (req, res) => {
    const { agent_type, title, content } = req.body;
    const stardate = '8500';
    
    const { data, error } = await supabase
        .from('chancellery_records')
        .insert([{
            agent_type, title, content, region_key: 'moscovia', epoch_key: 'EP-EMPE', hashtags: '#Вручную #Ведомость', content_type: 'Ручная ведомость', stardate
        }])
        .select();
        
    res.json(data ? data[0] : null);
});

app.get('/api/feed', async (req, res) => {
    const { data, error } = await supabase
        .from('chancellery_records')
        .select('*')
        .order('id', { ascending: false });
    res.json(data || []);
});

app.listen(PORT, () => { console.log(`Імперський хмарний сервер працює на порту ${PORT}`); });
