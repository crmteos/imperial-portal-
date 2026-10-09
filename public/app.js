document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('search-btn');
    const topicInput = document.getElementById('topic-input');
    const scoutLoader = document.getElementById('scout-loader');
    const scoutResults = document.getElementById('scout-results');
    const rawFactsText = document.getElementById('raw-facts-text');

    const sendToChancellorBtn = document.getElementById('send-to-chancellor-btn');
    const chancellorLoader = document.getElementById('chancellor-loader');
    const chancellorResults = document.getElementById('chancellor-results');
    const markdownContent = document.getElementById('markdown-content');
    const chancellorDocTitle = document.getElementById('chancellor-doc-title');

    const sendToArchivistBtn = document.getElementById('send-to-archivist-btn');

    let currentTopic = "";
    let currentRawData = "";
    let generatedDocument = "";

    // 1. КРОК СКАУТА: Пошук
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const topic = topicInput.value.trim();
            if (!topic) return alert("Будь ласка, введіть тему!");

            currentTopic = topic;
            scoutLoader.style.display = 'block';
            scoutResults.style.display = 'none';

            try {
                const response = await fetch('/api/scout/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: topic })
                });
                const data = await response.json();
                
                if (data.status === "success") {
                    currentRawData = data.rawData;
                    rawFactsText.value = currentRawData;
                    scoutResults.style.display = 'block';
                } else {
                    alert("Помилка розвідки: " + data.error);
                }
            } catch (err) {
                alert("Не вдалося зв'язатися із сервером: " + err.message);
            } finally {
                scoutLoader.style.display = 'none';
            }
        });
    }

    // 2. КРОК КАНЦЛЕРА: Написання Маніфесту
    if (sendToChancellorBtn) {
        sendToChancellorBtn.addEventListener('click', async () => {
            chancellorLoader.style.display = 'block';
            chancellorResults.style.display = 'none';

            try {
                const response = await fetch('/api/chancellor/write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topic: currentTopic,
                        rawData: currentRawData
                    })
                });
                const data = await response.json();

                if (data.status === "success") {
                    generatedDocument = data.document;
                    chancellorDocTitle.innerText = `📜 Державний Маніфест: ${data.title}`;
                    
                    // Простий рендер Markdown у HTML
                    markdownContent.innerHTML = data.document
                        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                        .replace(/\*(.*)\*/gim, '<em>$1</em>')
                        .replace(/\n/g, '<br>');

                    chancellorResults.style.display = 'block';
                } else {
                    alert("Канцлер не зміг скласти маніфест: " + data.error);
                }
            } catch (err) {
                alert("Зв'язок із Канцелярією перервано: " + err.message);
            } finally {
                chancellorLoader.style.display = 'none';
            }
        });
    }

    // 3. КРОК АРХІВІУСА: Збереження у БД
    if (sendToArchivistBtn) {
        sendToArchivistBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/archivist/store', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: currentTopic,
                        document: generatedDocument,
                        author: "Канцелярія Великого Канцлера"
                    })
                });
                const data = await response.json();

                if (data.status === "archived") {
                    localStorage.setItem('last_archived', `Успішно заархівовано! Документу "${currentTopic}" присвоєно індекс #${data.recordId}`);
                    window.location.href = "archive.html";
                } else {
                    alert("Архівіус не прийняв документ: " + data.error);
                }
            } catch (err) {
                alert("Помилка зв'язку з архівом: " + err.message);
            }
        });
    }
});
