// C:\email-responder\backend\public\app.js

const API_BASE_URL = 'http://localhost:3000';

function setupEventListeners() {
  const container = document.getElementById('replies');
  container.addEventListener('click', async (event) => {
    const targetButton = event.target;
    const replyBox = targetButton.closest('.reply-box');
    if (!replyBox) return;
    // --- HANDLE "TRANSLATE ORIGINAL" LINK ---
    if (targetButton.classList.contains('translate-original-link')) {
      event.preventDefault();
      const link = targetButton;
      const targetId = link.dataset.targetId;
      const bodySpan = document.getElementById(targetId);
      const translationContainerId = link.dataset.translationContainerId;
      const translationContainer = document.getElementById(translationContainerId);
      if (!bodySpan || !translationContainer) return;
      const currentText = bodySpan.textContent;
      if (currentText.trim() === "") return;
      link.textContent = '(Translating...)';
      link.style.pointerEvents = 'none';
      try {
        const response = await fetch(`${API_BASE_URL}/translate-reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ textToTranslate: currentText }) });
        if (!response.ok) throw new Error('Translation failed.');
        const data = await response.json();
        translationContainer.innerHTML = `<hr style="margin: 15px 0;"><p><strong>Arabic Translation:</strong><br><span class="arabic-translation-text">${data.translatedText}</span></p>`;
        translationContainer.style.direction = 'rtl';
        translationContainer.style.textAlign = 'right';
        link.style.display = 'none';
      } catch (error) {
        console.error(error);
        alert(error.message);
        link.textContent = '(Translate to Arabic)';
        link.style.pointerEvents = 'auto';
      }
    }
    // --- HANDLE GENERATE BUTTONS ---
    if (targetButton.classList.contains('generate-english-button') || targetButton.classList.contains('generate-arabic-button')) {
      const isArabic = targetButton.classList.contains('generate-arabic-button');
      const endpoint = isArabic ? '/generate-arabic-reply' : '/generate-english-reply';
      const userHint = window.prompt("What should this reply be about? (e.g., 'agree to the meeting on Friday at 2pm')");
      if (userHint === null || userHint.trim() === "") return;
      targetButton.textContent = 'Generating...';
      targetButton.disabled = true;
      const otherButton = isArabic ? replyBox.querySelector('.generate-english-button') : replyBox.querySelector('.generate-arabic-button');
      if (otherButton) otherButton.disabled = true;
      const textarea = replyBox.querySelector('.reply-textarea');
      const emailData = { from: replyBox.dataset.from, subject: replyBox.dataset.subject, body: replyBox.dataset.body, userHint: userHint };
      try {
        textarea.classList.add('thinking');
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(emailData) });
        if (!response.ok) throw new Error('Failed to generate reply from AI.');
        const data = await response.json();
        textarea.value = data.reply;
        textarea.style.direction = isArabic ? 'rtl' : 'ltr';
      } catch (error) {
        console.error(error);
        alert(error.message);
      } finally {
        textarea.classList.remove('thinking');
        targetButton.textContent = isArabic ? 'Generate Arabic Reply' : 'Generate English Reply';
        targetButton.disabled = false;
        if (otherButton) otherButton.disabled = false;
      }
    }
    // --- HANDLE "SEND EMAIL" BUTTON ---
    if (targetButton.classList.contains('send-button')) {
      const sendButton = targetButton;
      const sendEmailData = { from: replyBox.dataset.from, toHeader: replyBox.dataset.to, subject: replyBox.dataset.subject, threadId: replyBox.dataset.threadid, originalMessageId: replyBox.dataset.messageid, replyBody: replyBox.querySelector('.reply-textarea').value };
      try {
        sendButton.textContent = 'Sending...';
        sendButton.disabled = true;
        const response = await fetch(`${API_BASE_URL}/send-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sendEmailData) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to send');
        sendButton.textContent = '✅ Sent!';
        replyBox.classList.add('sent');
      } catch (error) {
        console.error('Error sending email:', error);
        alert(`Error: ${error.message}`);
        sendButton.textContent = 'Send Email';
        sendButton.disabled = false;
      }
    }
  });
}
async function loadAndDisplayEmails() {
  const container = document.getElementById('replies');
  try {
    const response = await fetch('/get-unread-emails');
    if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
    const emails = await response.json();
    if (!emails || emails.length === 0) { container.innerHTML = '<p>No unread emails found. Great job!</p>'; return; }
    container.innerHTML = '';
    emails.forEach(email => {
      const replyDiv = document.createElement('div');
      replyDiv.className = 'reply-box';
      replyDiv.dataset.emailId = email.id;
      replyDiv.dataset.threadid = email.threadId;
      replyDiv.dataset.from = email.from;
      replyDiv.dataset.to = email.toHeader;
      replyDiv.dataset.subject = email.subject;
      replyDiv.dataset.messageid = email.originalMessageId;
      replyDiv.dataset.body = email.body;
      replyDiv.innerHTML = `
        <div class="email-header">
          <p><strong>Date:</strong> ${email.date}</p>
          <p><strong>Subject:</strong> ${email.subject}</p>
          <p><strong>From:</strong> ${email.from}</p>
          <p><strong>To:</strong> ${email.toHeader}</p>
        </div>
        <hr>
        <p>
          <strong>Original Message:</strong>
          <a href="#" class="translate-original-link" data-target-id="original-body-${email.id}" data-translation-container-id="translation-container-${email.id}">(Translate to Arabic)</a>
          <br>
          <!-- THIS IS THE CORRECTED LINE - The class="original-body" was added -->
          <span id="original-body-${email.id}" class="original-body">${email.body}</span>
        </p>
        <div class="translation-container" id="translation-container-${email.id}"></div>
        <hr>
        <textarea class="reply-textarea" placeholder="Click a 'Generate' button or type your reply here..."></textarea>
        <br>
        <button class="generate-english-button">Generate English Reply</button>
        <button class="generate-arabic-button">Generate Arabic Reply</button>
        <button class="send-button">Send Email</button>
      `;
      container.appendChild(replyDiv);
    });
  } catch (error) {
    console.error('Failed to load emails:', error);
    container.innerHTML = `<p style="color: red;">Failed to load emails. Is the backend server running? (node server.js)</p>`;
  }
}
async function initialize() {
  document.getElementById('refresh-button').addEventListener('click', async (event) => {
    const refreshButton = event.target;
    refreshButton.textContent = 'Refreshing...';
    refreshButton.disabled = true;
    await loadAndDisplayEmails();
    refreshButton.textContent = 'Refresh Emails';
    refreshButton.disabled = false;
  });
  await loadAndDisplayEmails();
  setupEventListeners();
}
initialize();