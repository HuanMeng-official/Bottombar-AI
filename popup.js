let chatHistory = [];
let settings = {};
let currentStreamingMessage = null;

document.addEventListener('DOMContentLoaded', function () {
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const stopBtn = document.getElementById('stopBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const chatBtn = document.getElementById('chatBtn');
    const chatContainer = document.getElementById('chatContainer');
    const settingsContainer = document.getElementById('settingsContainer');
    const statusDiv = document.getElementById('status');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');

    let currentReader = null;

    loadSettings();
    restoreOptions();

    settingsBtn.addEventListener('click', function () {
        chatContainer.classList.add('container-hidden');
        chatContainer.classList.remove('container-visible');
        settingsContainer.classList.add('container-visible');
        settingsContainer.classList.remove('container-hidden');
        settingsBtn.style.display = 'none';
        chatBtn.style.display = 'inline-block';
        document.getElementById('mainTitle').textContent = '设置';
    });

    chatBtn.addEventListener('click', function () {
        settingsContainer.classList.add('container-hidden');
        settingsContainer.classList.remove('container-visible');
        chatContainer.classList.add('container-visible');
        chatContainer.classList.remove('container-hidden');
        chatBtn.style.display = 'none';
        settingsBtn.style.display = 'inline-block';
        document.getElementById('mainTitle').textContent = 'AI 对话助手';
    });

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    saveSettingsBtn.addEventListener('click', saveOptions);

    stopBtn.addEventListener('click', stopStreaming);

    function loadSettings() {
        chrome.storage.sync.get([
            'apiEndpoint',
            'apiKey',
            'model',
            'temperature',
            'systemPrompt'
        ], function (items) {
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
        ], function (items) {
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
        }, function () {
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

    function stopStreaming() {
        if (currentReader) {
            currentReader.cancel();
            currentReader = null;
        }

        if (currentStreamingMessage) {
            currentStreamingMessage = null;
        }

        userInput.disabled = false;
        sendBtn.disabled = false;
        sendBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        statusDiv.textContent = '已停止生成';
        statusDiv.className = 'error';

        setTimeout(() => {
            statusDiv.textContent = '';
        }, 2000);
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
        userInput.disabled = true;
        sendBtn.disabled = true;
        sendBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        statusDiv.textContent = 'AI 正在思考...';
        statusDiv.className = 'loading';

        try {
            const streamingMessage = createStreamingMessage();
            currentStreamingMessage = streamingMessage;

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
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
            }

            const reader = response.body.getReader();
            currentReader = reader;
            const decoder = new TextDecoder();
            let fullMessage = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

                    if (trimmedLine.startsWith('data: ')) {
                        try {
                            const jsonStr = trimmedLine.substring(6);
                            const data = JSON.parse(jsonStr);

                            if (data.choices && data.choices[0] && data.choices[0].delta) {
                                const content = data.choices[0].delta.content;
                                if (content) {
                                    fullMessage += content;
                                    updateStreamingMessage(streamingMessage, fullMessage);
                                }
                            }
                        } catch (e) {
                        }
                    }
                }
            }

            chatHistory.push({ role: 'assistant', content: fullMessage });
            currentStreamingMessage = null;

        } catch (error) {
            console.error('获取 AI 回复时出错:', error);
            statusDiv.textContent = `错误: ${error.message}`;
            statusDiv.className = 'error';

            if (currentStreamingMessage) {
                currentStreamingMessage.remove();
                currentStreamingMessage = null;
            }
        } finally {
            userInput.disabled = false;
            sendBtn.disabled = false;
            sendBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
            statusDiv.textContent = '';
            currentReader = null;
        }
    }

    function createStreamingMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'ai-message', 'streaming-message');

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content', 'streaming-content');

        messageDiv.appendChild(contentDiv);
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        return messageDiv;
    }

    function updateStreamingMessage(streamingMessage, content) {
        const contentDiv = streamingMessage.querySelector('.streaming-content');
        if (!contentDiv) return;

        if (typeof marked !== 'undefined') {
            contentDiv.innerHTML = marked.parse(content);
        } else {
            contentDiv.textContent = content;
        }

        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function addMessageToUI(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        if (sender === 'ai' && typeof marked !== 'undefined') {
            contentDiv.innerHTML = marked.parse(content);
        } else {
            contentDiv.textContent = content;
        }

        messageDiv.appendChild(contentDiv);
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});
