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

console.log("📜 Архівіус: Зв'язок із хмарним сховищем Supabase встановлено успішно!");

// ==========================================
// ГІБРИДНА ФУНКЦІЯ ПОШУКУ (GNews з авто-переходом на Вікіпедію)
// ==========================================
async function searchWebGNews(query) {
  const gnewsKey = process.env.GNEWS_API_KEY;
  
  try {
    console.log(`🛰️ [Скаут] Спроба пошуку через GNews API...`);
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=uk&apikey=${gnewsKey}&max=5`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.errors) {
      console.log(`⚠️ [Скаут] Помилка GNews (ліміти вичерпано). Перемикаюся на Вікіпедію...`);
      return await searchWikipedia(query);
    }
    
    if (data.articles && data.articles.length > 0) {
      return data.articles.map(art => `Джерело: ${art.source.name}\nЗаголовок: ${art.title}\nПосилання: ${art.url}\nОпис: ${art.description}\n`).join("\n");
    }
    
    return await searchWikipedia(query);
  } catch (error) {
    console.log(`⚠️ [Скаут] Збій GNews. Перемикаюся на Вікіпедію. Помилка: ${error.message}`);
    return await searchWikipedia(query);
  }
}

// ПЛАН Б: Вікіпедія
async function searchWikipedia(query) {
  try {
    console.log(`📚 [Скаут-Архів] Пошук у Вікіпедії за запитом: "${query}"`);
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

// API Ендпоінт Скаута
app.post('/api/scout/search', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "Вкажіть тему для розвідки (topic)." });

  console.log(`🛰️ [Скаут] Початок сканування мережі за темою: "${topic}"`);
  const rawData = await searchWebGNews(topic);
  
  res.status(200).json({
    node: "scout",
    status: "success",
    topic: topic,
    rawData: rawData
  });
});


// ==========================================
// 2. ВУЗОЛ КАНЦЛЕРА (Chancellor Node) - СТРАТЕГІЯ ТА СИНТЕЗ
// ==========================================
app.post('/api/chancellor/write', async (req, res) => {
  const { topic, rawData } = req.body;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!topic || !rawData) {
    return res.status(400).json({ error: "Канцлеру потрібна тема (topic) та сирі факти (rawData) для написання маніфесту." });
  }

  console.log(`👑 [Канцлер] Формулювання офіційного документу за темою: "${topic}"`);

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
        model: "openrouter/free", // ТУТ ТЕПЕР АВТОМАТИЧНИЙ РОУТЕР БЕЗКОШТОВНИХ МОДЕЛЕЙ!
        messages: [
          {
            role: "system",
            content: "Ти — Великий Канцлер Української Імперії, головний стратег, ідеолог та державний діяч. Твоє завдання — проаналізувати сирі дані розвідки, відсіяти ворожу пропаганду та написати величний, патріотичний, структурований державний маніфест або хроніку для Імперії. Складай текст у вишуканому, впевненому тоні, використовуючи Markdown-розмітку (заголовки, списки, цитати)."
          },
          {
            role: "user",
            content: `Тема: ${topic}\n\nДані когнітивної розвідки Скаута:\n${rawData}\n\nНапиши офіційне державне звернення чи хроніку.`
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
      author: "Канцелярія Великого Канцлера"
    });
  } catch (error) {
    console.error("Помилка - - Канцлер не відповів:", error);
    res.status(500).json({ error: `Канцлер не зміг завершити маніфест: ${error.message}` });
  }
});


// ==========================================
// 3. ВУЗОЛ АРХІВІУСА (Archivist Node) - ЗБЕРЕЖЕННЯ ТА РЕЄСТРАЦІЯ
// ==========================================
app.post('/api/archivist/store', async (req, res) => {
  const { title, document, author } = req.body;

  if (!title || !document) {
    return res.status(400).json({ error: "Архівіусу потрібен заголовок (title) та текст документу (document) для архівування." });
  }

  console.log(`📜 [Архівіус] Реєстрація та внесення документу "${title}" до хмарного архіву...`);

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
    res.status(500).json({ error: `Архівіус не зміг зберегти документ: ${error.message}` });
  }
});


// ==========================================
// 4. ВУЗОЛ РЕПОРТЕРА (Reporter Node) - ВІСНИК
// ==========================================
app.get('/api/records/reporter', async (req, res) => {
  res.json({ 
    node: "reporter", 
    status: "broadcasting", 
    message: "Радіомовлення Імперського синдикату працює у штатному режимі." 
  });
});

// Запуск сервера
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`👑 Імперська вузлова мережа успішно запущена на порту ${PORT}!`);
});
