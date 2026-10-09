const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch'); // Переконайтеся, що node-fetch встановлено, або використовуйте вбудований fetch у Node.js 18+

const app = express();
app.use(cors());
app.use(express.json());

// 1. Ініціалізація Supabase за допомогою змінних оточення
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("Успішно підключено до хмарної бази даних Supabase!");

// 2. Функція пошуку в інтернеті через Serper.dev API
async function searchWeb(query) {
  // Якщо у нас є ключ Serper API, використовуємо його, інакше робимо простий запит
  const serperKey = process.env.SERPER_API_KEY || "ВАШ_БЕЗКОШТОВНИЙ_SERPER_KEY_ЯКЩО_Є";
  
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
    
    // Форматуємо знайдені результати для ШІ
    if (data.organic) {
      return data.organic.map(item => `Джерело: ${item.title}\nПосилання: ${item.link}\nОпис: ${item.snippet}\n`).join("\n");
    }
    return "Результатів пошуку не знайдено.";
  } catch (error) {
    console.error("Помилка при пошуку в інтернеті:", error);
    return `Не вдалося виконати пошук: ${error.message}`;
  }
}

// 3. Функція генерації контенту через OpenRouter
async function generateImperialRecord(topic, searchContext) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://imperial-portal.run.app",
        "X-OpenRouter-Title": "Imperial Portal Chancery Agent"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3-8b-instruct:free", // безкоштовна та швидка модель
        messages: [
          {
            role: "system",
            content: "Ти — Головний Архівіст та Писар Канцелярії Української Імперії. Твоє завдання — писати високоякісні, структуровані, історично достовірні та патріотичні статті/записи для імперського репозиторію на основі наданих матеріалів пошуку. Форматуй текст у красивий Markdown з підзаголовками."
          },
          {
            role: "user",
            content: `Тема дослідження: ${topic}\n\nЗнайдені матеріали в інтернеті:\n${searchContext}\n\nНапиши детальну статтю для репозиторію.`
          }
        ]
      })
    });
    
    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error) {
    console.error("Помилка генерації через OpenRouter:", error);
    return null;
  }
}

// 4. Ендпоінт для автоматичного виконання завдань Скан-агентом (Scout)
app.post('/api/scout/auto-execute', async (req, res) => {
  const { topic } = req.body; // Отримуємо тему, яку треба дослідити
  
  if (!topic) {
    return res.status(400).json({ error: "Будь ласка, вкажіть тему для дослідження (topic)." });
  }

  try {
    console.log(`[Скаут] Початок дослідження теми: "${topic}"`);
    
    // Крок A. Пошук в інтернеті
    const searchResults = await searchWeb(topic);
    
    // Крок B. Генерація статті через ШІ
    console.log(`[Канцелярія] Обробка результатів пошуку через OpenRouter...`);
    const finalArticle = await generateImperialRecord(topic, searchResults);
    
    if (!finalArticle) {
      throw new Error("Не вдалося згенерувати статтю через ШІ.");
    }

    // Крок C. Запис результату в Supabase в таблицю 'records'
    console.log(`[Архівіст] Збереження статті в Supabase...`);
    const { data, error } = await supabase
      .from('records')
      .insert([
        {
          title: topic,
          content: finalArticle,
          author: 'Канцелярія ШІ (Скаут)',
          created_at: new Date()
        }
      ])
      .select();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "Дослідження завершено успішно, статтю додано в репозиторій!",
      record: data[0]
    });

  } catch (error) {
    console.error("Помилка під час авто-виконання:", error);
    res.status(500).json({ error: error.message });
  }
});

// Інші ваші ендпоінти (як-от /api/records/reporter тощо) залишаються без змін...
app.get('/api/records/reporter', async (req, res) => {
  // Ваша логіка для репортера
  res.json({ status: "active" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Імперський хмарний сервер працює на порту ${PORT}`);
});
