const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ініціалізація Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("📜 [Архіваріус]: Зв'язок із хмарним сховищем Supabase встановлено успішно!");

// ==========================================
// ГІБРИДНА ФУНКЦІЯ ПОШУКУ (GNews з авто-переходом на Вікіпедію)
// ==========================================
async function searchWebGNews(query) {
  const gnewsKey = process.env.GNEWS_API_KEY;
  
  try {
    console.log(`🚃 [Вагон дослідників] Спроба пошуку через GNews API за темою: "${query}"...`);
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=uk&apikey=${gnewsKey}&max=5`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.errors) {
      console.log(`⚠️ [Вагон дослідників] Помилка GNews (ліміти вичерпано). Перемикаюся на Вікіпедію...`);
      return await searchWikipedia(query);
    }
    
    if (data.articles && data.articles.length > 0) {
      return data.articles.map(art => `Джерело: ${art.source.name}\nЗаголовок: ${art.title}\nПосилання: ${art.url}\nОпис: ${art.description}\n`).join("\n");
    }
    
    return await searchWikipedia(query);
  } catch (error) {
    console.log(`⚠️ [Вагон дослідників] Збій GNews. Перемикаюся на Вікіпедію. Помилка: ${error.message}`);
    return await searchWikipedia(query);
  }
}

// ПЛАН Б: Вікіпедія
async function searchWikipedia(query) {
  try {
    console.log(`📚 [Вагон дослідників - Архів] Пошук у Вікіпедії за запитом: "${query}"`);
    const url = `https://uk.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.query && data.query.search && data.query.search.length > 0) {
      return data.query.search.map(item => {
        const cleanSnippet = item.snippet.replace(/<[^>]*>/g, '');
        return `Джерело: Українська Вікіпедія\nЗаголовок: ${item.title}\nПосилання: https://uk.wikipedia.org/wiki/${encodeURIComponent(item.title)}\nОпис: ${cleanSnippet}...\n`;
      }).join("\n");
    }
    return "На жаль, інформації не знайдено ні в новинах, ні у Вікіпедії.";
  } catch (error) {
    console.error("Помилка пошуку у Вікіпедії:", error);
    return `Не вдалося виконати пошук навіть у Вікіпедії: ${error.message}`;
  }
}

// API Ендпоінт: Вагон дослідників (колишній Скаут)
app.post('/api/vagon/search', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "Вкажіть тему для дослідження (topic)." });

  console.log(`🚃 [Вагон дослідників] Початок сканування мережі за темою: "${topic}"`);
  const rawData = await searchWebGNews(topic);
  
  res.status(200).json({
    node: "vagon-doslidnykiv",
    status: "success",
    topic: topic,
    rawData: rawData
  });
});

// Аліас для зворотньої сумісності зі старим фронтендом
app.post('/api/scout/search', async (req, res) => {
  console.log("🔄 [Аліас] Запит переспрямовано зі старого /api/scout/search на новий /api/vagon/search");
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "Вкажіть тему для дослідження (topic)." });
  const rawData = await searchWebGNews(topic);
  res.status(200).json({ node: "scout", status: "success", topic, rawData });
});


// ==========================================
// 2. ВУЗОЛ КАНЦЕЛЯРІЇ (Канцлер) - СТРАТЕГІЯ ТА СИНТЕЗ
// ==========================================
app.post('/api/chancellor/write', async (req, res) => {
  const { topic, rawData } = req.body;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!topic || !rawData) {
    return res.status(400).json({ error: "Канцелярії потрібна тема (topic) та сирі факти (rawData) для написання маніфесту." });
  }

  console.log(`🏛️ [Канцелярія] Формулювання офіційного документу за темою: "${topic}"`);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://imperial-portal.run.app",
        "X-OpenRouter-Title": "Imperial Portal Chancellor Node"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [
          {
            role: "system",
            content: "Ти — Головний Радник та стратег Канцелярії Української Імперії. Твоє завдання — проаналізувати сирі дані, зібрані Вагоном дослідників, відсіяти неперевірену інформацію та написати державний маніфест, аналітичне зведення або імперську хроніку. Складай текст у вишуканому, патріотичному, впевненому тоні, використовуючи Markdown-розмітку."
          },
          {
            role: "user",
            content: `Тема: ${topic}\n\nДані дослідників:\n${rawData}\n\nНапиши офіційне державне звернення чи хроніку.`
          }
        ]
      })
    });
    
    const result = await response.json();
    console.log("🔍 [DEBUG] Відповідь від OpenRouter API:", JSON.stringify(result));
    
    const finalDocument = result.choices[0].message.content;

    res.status(200).json({
      node: "chancellor",
      status: "success",
      title: topic,
      document: finalDocument,
      author: "Канцелярія Української Імперії"
    });
  } catch (error) {
    console.error("Помилка Канцелярії:", error);
    res.status(500).json({ error: `Канцелярія не змогла завершити документ: ${error.message}` });
  }
});


// ==========================================
// 3. ВУЗОЛ АРХІВАРІУСА (Archivist Node) - ЗБЕРЕЖЕННЯ ТА РЕЄСТРАЦІЯ
// ==========================================
app.post('/api/archivist/store', async (req, res) => {
  const { title, document, author } = req.body;

  if (!title || !document) {
    return res.status(400).json({ error: "Архіваріусу потрібен заголовок (title) та текст документу (document) для архівування." });
  }

  console.log(`📁 [Архіваріус] Реєстрація та внесення документу "${title}" до хмарного архіву Supabase...`);

  try {
    const { data, error } = await supabase
      .from('records')
      .insert([
        {
          title: title,
          content: document,
          author: author || 'Імперський Архів',
          created_at: new Date()
        }
      ])
      .select();

    if (error) throw error;

    res.status(200).json({
      node: "archivist",
      status: "archived",
      recordId: data[0].id,
      message: `Документ успішно зареєстровано під індексом #${data[0].id}`,
      storedRecord: data[0]
    });
  } catch (error) {
    console.error("Помилка Архівіуса:", error);
    res.status(500).json({ error: `Архіваріус не зміг зберегти документ: ${error.message}` });
  }
});


// ==========================================
// 4. ВУЗОЛ НОВИНАРЯ (Novynar Node) - ВІСНИК ТА СТРІЧКА
// ==========================================
app.get('/api/novynar/news', async (req, res) => {
  console.log(`📰 [Новинарь] Отримання списку останніх імперських подій та новин...`);
  
  try {
    // Тягнемо з бази Supabase останні зареєстровані архіви як новинні приводи
    const { data, error } = await supabase
      .from('records')
      .select('id, title, author, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    res.status(200).json({
      node: "novynar",
      status: "broadcasting",
      message: "Стрічка новин сформована на основі державних архівів.",
      news: data
    });
  } catch (error) {
    console.log("⚠️ [Новинарь] Не вдалося завантажити архівні новини, віддаю резервну стрічку.");
    res.status(200).json({
      node: "novynar",
      status: "broadcasting",
      message: "Резервна новинна стрічка (Локальна).",
      news: [
        { id: 0, title: "Вагон дослідників успішно перепідпорядковано Канцелярії", author: "Канцелярія", created_at: new Date() },
        { id: -1, title: "Репозиторій синхронізовано з новою українізованою архітектурою", author: "Портал", created_at: new Date() }
      ]
    });
  }
});

// Аліас для старого репортера
app.get('/api/records/reporter', async (req, res) => {
  console.log("🔄 [Аліас] Запит переспрямовано зі старого /api/records/reporter на новий /api/novynar/news");
  res.json({ 
    node: "novynar", 
    status: "broadcasting", 
    message: "Служба новин перенесена до Новинаря. Радіомовлення Медіаімперії працює." 
  });
});

// Запуск сервера
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`👑 Імперська вузлова мережа успішно запущена на порту ${PORT}!`);
});
