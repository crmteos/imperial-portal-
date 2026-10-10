// Клієнтська логіка взаємодії з агентами Порталу

document.addEventListener('DOMContentLoaded', () => {
    // Елементи сторінки Вагона дослідників
    const vagonSearchBtn = document.getElementById('vagon-search-btn');
    const vagonTopicInput = document.getElementById('vagon-topic');
    const vagonResults = document.getElementById('vagon-results');
    const vagonRawData = document.getElementById('vagon-raw-data');
    const sendToChancellorBtn = document.getElementById('send-to-chancellor-btn');
    
    // Елементи Канцелярії та Архіву
    const chancellorDocumentSection = document.getElementById('chancellor-document');
    const manifestContent = document.getElementById('manifest-content');
    const saveToArchiveBtn = document.getElementById('save-to-archive-btn');
    
    const loading = document.getElementById('loading');

    let currentTopic = '';
    let currentRawData = '';
    let currentDocument = '';

    // 1. ЗАПУСК ВАГОНУ ДОСЛІДНИКІВ (ПОШУК)
    if (vagonSearchBtn) {
        vagonSearchBtn.addEventListener('click', async () => {
            const topic = vagonTopicInput.value.trim();
            if (!topic) {
                alert('Будь ласка, вкажіть тему для дослідження.');
                return;
            }

            currentTopic = topic;
            loading.style.display = 'block';
            vagonResults.style.display = 'none';
            chancellorDocumentSection.style.display = 'none';

            try {
                const response = await fetch('/api/vagon/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: topic })
                });
                
                const data = await response.json();
                loading.style.display = 'none';

                if (data.status === 'success') {
                    currentRawData = data.rawData;
                    vagonRawData.textContent = data.rawData;
                    vagonResults.style.display = 'block';
                } else {
                    alert('Помилка дослідження: ' + (data.error || 'невідома помилка'));
                }
            } catch (err) {
                loading.style.display = 'none';
                alert('Не вдалося зв\'язатися з Вагоном дослідників: ' + err.message);
            }
        });
    }

    // 2. ПЕРЕДАЧА ДАНИХ ДО КАНЦЕЛЯРІЇ
    if (sendToChancellorBtn) {
        sendToChancellorBtn.addEventListener('click', async () => {
            if (!currentTopic || !currentRawData) return;

            loading.style.display = 'block';
            chancellorDocumentSection.style.display = 'none';

            try {
                const response = await fetch('/api/chancellor/write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: currentTopic, rawData: currentRawData })
                });

                const data = await response.json();
                loading.style.display = 'none';

                if (data.status === 'success') {
                    currentDocument = data.document;
                    // Просте перетворення Markdown-абзаців для відображення
                    manifestContent.innerHTML = data.document
                        .replace(/\n/g, '<br>')
                        .replace(/### (.*)/g, '<h3>$1</h3>')
                        .replace(/## (.*)/g, '<h2>$1</h2>');
                        
                    chancellorDocumentSection.style.display = 'block';
                } else {
                    alert('Помилка Канцелярії: ' + (data.error || 'невідома помилка'));
                }
            } catch (err) {
                loading.style.display = 'none';
                alert('Зв\'язок з Канцелярією перервано: ' + err.message);
            }
        });
    }

    // 3. ЗБЕРЕЖЕННЯ В АРХІВІУСА (SUPABASE)
    if (saveToArchiveBtn) {
        saveToArchiveBtn.addEventListener('click', async () => {
            if (!currentTopic || !currentDocument) return;

            loading.style.display = 'block';

            try {
                const response = await fetch('/api/archivist/store', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: currentTopic,
                        document: currentDocument,
                        author: "Канцелярія Української Імперії"
                    })
                });

                const data = await response.json();
                loading.style.display = 'none';

                if (data.status === 'archived') {
                    alert('Документ успішно заархівовано! ' + data.message);
                } else {
                    alert('Помилка збереження: ' + (data.error || 'невідома помилка'));
                }
            } catch (err) {
                loading.style.display = 'none';
                alert('Архіваріус не відповідає: ' + err.message);
            }
        });
    }
});
