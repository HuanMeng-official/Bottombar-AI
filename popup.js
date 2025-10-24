let chatHistory = [];
let settings = {};

document.addEventListener('DOMContentLoaded', function() {
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const chatBtn = document.getElementById('chatBtn');
    const chatContainer = document.getElementById('chatContainer');
    const settingsContainer = document.getElementById('settingsContainer');
    const statusDiv = document.getElementById('status');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');

    loadSettings();
    restoreOptions();

    settingsBtn.addEventListener('click', function() {
        chatContainer.classList.add('container-hidden');
        chatContainer.classList.remove('container-visible');
        settingsContainer.classList.add('container-visible');
        settingsContainer.classList.remove('container-hidden');
        settingsBtn.style.display = 'none';
        chatBtn.style.display = 'inline-block';
        document.getElementById('mainTitle').textContent = '设置';
    });

    chatBtn.addEventListener('click', function() {
        settingsContainer.classList.add('container-hidden');
        settingsContainer.classList.remove('container-visible');
        chatContainer.classList.add('container-visible');
        chatContainer.classList.remove('container-hidden');
        chatBtn.style.display = 'none';
        settingsBtn.style.display = 'inline-block';
        document.getElementById('mainTitle').textContent = 'AI 对话助手';
    });

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    saveSettingsBtn.addEventListener('click', saveOptions);

    function loadSettings() {
        chrome.storage.sync.get([
            'apiEndpoint', 
            'apiKey', 
            'model', 
            'temperature', 
            'systemPrompt'
        ], function(items) {
            settings = {
                apiEndpoint: items.apiEndpoint || '',
                apiKey: items.apiKey || '',
                model: items.model || 'gpt-3.5-turbo',
                temperature: items.temperature !== undefined ? items.temperature : 0.7,
                systemPrompt: items.systemPrompt || '你是一个有用的助手。'
            };
            chatHistory = [
                { role: 'system', content: settings.systemPrompt }
            ];
        });
    }

    function restoreOptions() {
        chrome.storage.sync.get([
            'apiEndpoint', 
            'apiKey', 
            'model', 
            'temperature', 
            'systemPrompt'
        ], function(items) {
            document.getElementById('apiEndpoint').value = items.apiEndpoint || 'https://api.example.com/v1/chat/completions';
            document.getElementById('apiKey').value = items.apiKey || '';
            document.getElementById('model').value = items.model || 'gpt-3.5-turbo';
            document.getElementById('temperature').value = items.temperature !== undefined ? items.temperature : 0.7;
            document.getElementById('systemPrompt').value = items.systemPrompt || '你是一个有用的助手。';
        });
    }

    function saveOptions() {
        const apiEndpoint = document.getElementById('apiEndpoint').value;
        const apiKey = document.getElementById('apiKey').value;
        const model = document.getElementById('model').value;
        const temperature = parseFloat(document.getElementById('temperature').value);
        const systemPrompt = document.getElementById('systemPrompt').value;

        if (isNaN(temperature) || temperature < 0 || temperature > 2) {
            showStatus('温度必须是 0 到 2 之间的数字。', 'error');
            return;
        }

        chrome.storage.sync.set({
            apiEndpoint: apiEndpoint,
            apiKey: apiKey,
            model: model,
            temperature: temperature,
            systemPrompt: systemPrompt
        }, function() {
            showStatus('设置已保存！', 'success');
            loadSettings();
            if (chatHistory.length > 0 && chatHistory[0].role === 'system') {
                chatHistory[0].content = systemPrompt;
            } else {
                chatHistory.unshift({ role: 'system', content: systemPrompt });
            }
        });
    }

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = type;
        statusDiv.style.display = 'block';

        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        if (!settings.apiEndpoint || !settings.apiKey) {
            statusDiv.textContent = '请先在设置中配置 API 端点和 API Key。';
            statusDiv.className = 'error';
            return;
        }

        chatHistory.push({ role: 'user', content: message });
        addMessageToUI(message, 'user');

        userInput.value = '';
        statusDiv.textContent = 'AI 正在思考...';
        statusDiv.className = 'loading';

        try {
            const response = await fetch(settings.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                    model: settings.model,
                    messages: chatHistory,
                    temperature: settings.temperature,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                const aiMessage = data.choices[0].message.content;
                chatHistory.push({ role: 'assistant', content: aiMessage });
                addMessageToUI(aiMessage, 'ai');
            } else {
                throw new Error('API 响应格式不正确或没有返回消息。');
            }
        } catch (error) {
            console.error('获取 AI 回复时出错:', error);
            statusDiv.textContent = `错误: ${error.message}`;
            statusDiv.className = 'error';
        } finally {
            statusDiv.textContent = '';
        }
    }

    function addMessageToUI(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.textContent = content;

        messageDiv.appendChild(contentDiv);
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});
