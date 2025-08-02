// FINAL PRODUCTION app.js

document.addEventListener('DOMContentLoaded', () => {
    const refreshButton = document.getElementById('refreshEmails');
    const emailListDiv = document.getElementById('emailList');

    // Function to fetch details for a single email and display it
    async function fetchAndDisplayEmail(emailId) {
        try {
            const res = await fetch(`/get-email-details/${emailId.id}`);
            if (!res.ok) throw new Error(`Failed to fetch details for email ${emailId.id}`);
            const email = await res.json();
            
            // Once details are fetched, replace the placeholder
            const placeholderDiv = document.getElementById(`placeholder-${email.id}`);
            if (placeholderDiv) {
                placeholderDiv.innerHTML = createEmailHTML(email);
                addEventListenersToEmail(email.id);
            }

        } catch (error) {
            console.error(error);
            const placeholderDiv = document.getElementById(`placeholder-${emailId.id}`);
            if(placeholderDiv) placeholderDiv.innerHTML = `<p style="color:red;">Could not load email: ${emailId.id}</p>`;
        }
    }

    // Function to load all emails
    async function loadEmails() {
        emailListDiv.innerHTML = '<div class="loader"></div>'; // Show loader
        try {
            // STEP 1: Get only the list of email IDs
            const res = await fetch('/get-unread-email-ids');
            if (!res.ok) throw new Error('Is the backend server running? (server.js)');
            const emailIds = await res.json();

            if (emailIds.length === 0) {
                emailListDiv.innerHTML = '<p>No unread emails found.</p>';
                return;
            }

            // Clear the list and create a placeholder for each email
            emailListDiv.innerHTML = '';
            emailIds.forEach(emailId => {
                const placeholder = document.createElement('div');
                placeholder.className = 'email-item-placeholder';
                placeholder.id = `placeholder-${emailId.id}`;
                placeholder.innerHTML = `<p>Loading email...</p>`;
                emailListDiv.appendChild(placeholder);
            });
            
            // STEP 2: Fetch details for each email individually
            for (const emailId of emailIds) {
                fetchAndDisplayEmail(emailId);
            }

        } catch (error) {
            emailListDiv.innerHTML = `<p style="color: red;">Failed to load emails. ${error.message}</p>`;
        }
    }

    // --- All other functions remain mostly the same ---
    
    refreshButton.addEventListener('click', loadEmails);

    // Initial load
    loadEmails();
});


function createEmailHTML(email) {
    return `
        <div class="email-header">
            <p><strong>Date:</strong> ${email.date}</p>
            <p><strong>Subject:</strong> ${email.subject}</p>
            <p><strong>From:</strong> ${escapeHTML(email.from)}</p>
            <p><strong>To:</strong> ${escapeHTML(email.toHeader)}</p>
        </div>
        <div class="email-body">
            <p><strong>Original Message:</strong> <span class="translate-link" style="cursor:pointer; color:blue; text-decoration:underline;">(Translate to Arabic)</span></p>
            <pre class="original-text">${escapeHTML(email.body)}</pre>
            <pre class="translated-text" style="display:none;"></pre>
        </div>
        <div class="email-reply">
            <textarea placeholder="Click a 'Generate' button or type your reply here..."></textarea>
            <div class="user-hint">
                 <input type="text" placeholder="Optional: Add a hint for the AI (e.g., 'Politely decline')">
            </div>
            <button class="generate-en-reply">Generate English Reply</button>
            <button class="generate-ar-reply">Generate Arabic Reply</button>
            <button class="send-email">Send Email</button>
        </div>
    `;
}

function addEventListenersToEmail(emailId) {
    const emailDiv = document.getElementById(`placeholder-${emailId}`);
    if (!emailDiv) return;

    emailDiv.querySelector('.generate-en-reply').addEventListener('click', () => handleGenerateReply(emailDiv, 'en'));
    emailDiv.querySelector('.generate-ar-reply').addEventListener('click', () => handleGenerateReply(emailDiv, 'ar'));
    emailDiv.querySelector('.send-email').addEventListener('click', () => handleSendEmail(emailDiv));
    emailDiv.querySelector('.translate-link').addEventListener('click', () => handleTranslate(emailDiv));
}

async function handleGenerateReply(emailDiv, lang) {
    const originalText = emailDiv.querySelector('.original-text').textContent;
    const subject = emailDiv.querySelector('.email-header p:nth-child(2)').textContent.replace('Subject: ', '');
    const from = emailDiv.querySelector('.email-header p:nth-child(3)').textContent.replace('From: ', '');
    const userHint = emailDiv.querySelector('.user-hint input').value;
    const textarea = emailDiv.querySelector('textarea');
    
    textarea.value = 'Generating...';

    try {
        const endpoint = lang === 'ar' ? '/generate-arabic-reply' : '/generate-english-reply';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, subject, body: originalText, userHint })
        });
        const data = await res.json();
        textarea.value = data.reply;
    } catch (err) {
        textarea.value = 'Failed to generate reply.';
    }
}

async function handleSendEmail(emailDiv) {
    const sendButton = emailDiv.querySelector('.send-email');
    sendButton.textContent = 'Sending...';
    sendButton.disabled = true;

    // We need to retrieve the original email data again. 
    // This is not ideal, a better architecture would store this in memory or data attributes.
    // For now, this will work. Let's find the ID from the parent.
    const emailId = emailDiv.id.replace('placeholder-', '');
     try {
        // We must re-fetch the details to ensure we have the correct metadata.
        const res = await fetch(`/get-email-details/${emailId}`);
        if(!res.ok) throw new Error("Could not refetch email details to send.");
        const email = await res.json();
       
        const replyBody = emailDiv.querySelector('textarea').value;

        const sendRes = await fetch('/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: email.from,
                toHeader: email.toHeader,
                subject: email.subject,
                replyBody,
                threadId: email.threadId,
                originalMessageId: email.originalMessageId
            })
        });
        
        if (sendRes.ok) {
            sendButton.textContent = 'Sent!';
            emailDiv.style.opacity = '0.5';
            setTimeout(() => emailDiv.remove(), 2000);
        } else {
             const errorData = await sendRes.json();
             alert(`Failed to send email: ${errorData.message}`);
             sendButton.textContent = 'Send Email';
             sendButton.disabled = false;
        }

    } catch (err) {
        alert('An error occurred. ' + err.message);
        sendButton.textContent = 'Send Email';
        sendButton.disabled = false;
    }
}

async function handleTranslate(emailDiv) {
    const originalTextElem = emailDiv.querySelector('.original-text');
    const translatedTextElem = emailDiv.querySelector('.translated-text');
    const translateLink = emailDiv.querySelector('.translate-link');

    // If already translated, just toggle visibility
    if (translatedTextElem.textContent) {
        originalTextElem.style.display = 'none';
        translatedTextElem.style.display = 'block';
        translateLink.textContent = '(Show Original)';
        translateLink.onclick = () => showOriginal(emailDiv); // Change event handler
        return;
    }

    translateLink.textContent = '(Translating...)';
    try {
        const res = await fetch('/translate-reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ textToTranslate: originalTextElem.textContent })
        });
        const data = await res.json();
        translatedTextElem.textContent = data.translatedText;
        originalTextElem.style.display = 'none';
        translatedTextElem.style.display = 'block';
        translateLink.textContent = '(Show Original)';
        translateLink.onclick = () => showOriginal(emailDiv); // Change event handler

    } catch (err) {
        alert('Failed to translate.');
        translateLink.textContent = '(Translate to Arabic)';
    }
}

function showOriginal(emailDiv) {
    emailDiv.querySelector('.original-text').style.display = 'block';
    emailDiv.querySelector('.translated-text').style.display = 'none';
    const translateLink = emailDiv.querySelector('.translate-link');
    translateLink.textContent = '(Translate to Arabic)';
    translateLink.onclick = () => handleTranslate(emailDiv); // Reset to original handler
}

function escapeHTML(str) {
    const p = document.createElement("p");
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
}