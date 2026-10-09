const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Ініціалізація Supabase за допомогою змінних оточення
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("📜 Архівіус: Зв'язок із хмарним сховищем Supabase встановлено успішно!");

// ==========================================
// 1. ВУЗОЛ СКАУТА (Scout Node) - РОЗВІДКА
// ==========================================
async function searchWeb(query) {
  const serperKey = process.env.SERPER_API_KEY || "ВАШ_БЕЗКОШТОВНИЙ_SERPER_KEY";
  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": serperKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: query, num: 5 })
    });
    const data = await response.json();
    if (data.organic) {
      return data.organic.map(item => `Джерело: ${item.title}\nURL: ${item.link}\nОпис: ${item.snippet}\n`).join("\n");
    }
    return "Інформації в мережі не знайдено.";
  } catch (error) {
    console.error("Помилка пошуку Скаута:", error);
    return `Помилка пошуку: ${error.message}`;
  }
}

// API Ендпоінт Скаута
app.post('/api/scout/search', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "Вкажіть тему для розвідки (topic)." });

  console.log(`🛰️ [Скаут] Початок сканування мережі за темою: "${topic}"`);
  const rawData = await searchWeb(topic);
  
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
        model: "meta-llama/llama-3-8b-instruct:free",
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
    const finalDocument = result.choices[0].message.content;

    res.status(200).json({
      node: "chancellor",
      status: "success",
      title: topic,
      document: finalDocument,
      author: "Канцелярія Великого Канцлера"
    });
  } catch (error) {
    console.error("Помилка Канцлера:", error);
    res.status(500).json({ error: `Канцлер не зміг завершити маніфест: ${error.message}` });
  }
});


// ==========================================
// 3. ВУЗОЛ АРХІВІУСА (Archivist Node) - ЗБЕРЕЖЕННЯ ТА РЕЄСТРАЦІЯ
// ==========================================
app.post('/api/archivist/store', async (req, res) => {
  const { title, document, author } = req.body;

  if (!title || !document) {
    return res.status(400).json({ error: "Архівіусу потрі��ен заголовок (title) та текст документу (document) для архівування." });
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
  console.log(`👑 Імперська вузлова мережа запущена на порту ${PORT}`);
});
