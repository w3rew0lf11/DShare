const chatContainer = document.getElementById('chatContainer');
const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const sendBtn = document.querySelector('.input-group button');

function toggleChat() {
  chatContainer.classList.toggle('hidden');
  if (!chatContainer.classList.contains('hidden')) {
    userInput.focus();
  }
}

function appendMessage(text, sender) {
  const msg = document.createElement('div');
  msg.classList.add('msg', sender);
  msg.textContent = text;
  chatbox.appendChild(msg);
  chatbox.scrollTop = chatbox.scrollHeight;
}

async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  appendMessage(message, 'user');
  userInput.value = '';
  userInput.disabled = true;
  sendBtn.disabled = true;

  try {
    const response = await fetch('/get?msg=' + encodeURIComponent(message));
    const data = await response.text();
    appendMessage(data, 'bot');
  } catch (error) {
    appendMessage('Sorry, something went wrong.', 'bot');
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});
