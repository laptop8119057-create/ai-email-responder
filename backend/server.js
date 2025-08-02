// FINAL PRODUCTION server.js

const fs = require('fs').promises;
const path = require('path');
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { generateReply, generateArabicReply, translateText } = require('./generate-reply');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- GMAIL API LOGIC ---
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
async function authorize() {
  const credentialsContent = await fs.readFile(CREDENTIALS_PATH);
  const credentials = JSON.parse(credentialsContent);
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  const tokenContent = await fs.readFile(TOKEN_PATH);
  const token = JSON.parse(tokenContent);
oAuth2Client.setCredentials(token);
  return oAuth2Client;
}
function getEmailBody(payload) {
    let body = '';
    if (payload.parts) {
        const textPart = payload.parts.find(part => part.mimeType === 'text/plain');
        if (textPart && textPart.body && textPart.body.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf8');
        }
    } else if (payload.body && payload.body.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf8');
    }
    return body.trim();
}

// --- SERVER ENDPOINTS ---
app.get('/get-unread-emails', async (req, res) => {
  console.log('Received request to /get-unread-emails');
  try {
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });
    const listResponse = await gmail.users.messages.list({ userId: 'me', q: 'is:unread', maxResults: 5 });
    const messages = listResponse.data.messages || [];
    if (messages.length === 0) { console.log('No unread emails found.'); return res.json([]); }
    const emailReplies = [];
    for (const msg of messages) {
      const msgData = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
      const headers = msgData.data.payload.headers;
      
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const originalMessageId = headers.find(h => h.name === 'Message-ID')?.value || '';
      const toHeader = headers.find(h => h.name === 'To')?.value || '';
      const date = new Date(headers.find(h => h.name === 'Date')?.value || Date.now()).toLocaleString();
      
      // --- THIS IS THE CRITICAL FIX ---
      // Instead of using the snippet, we now parse the full body.
      const body = getEmailBody(msgData.data.payload);
      
      emailReplies.push({ id: msg.id, threadId: msgData.data.threadId, from, subject, body, originalMessageId, toHeader, date: date });
    }
    console.log(`Found and processed ${emailReplies.length} emails.`);
    res.json(emailReplies);
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).send('Error fetching emails from Gmail.');
  }
});


// All other endpoints below are unchanged and correct.
app.post('/generate-english-reply', async (req, res) => {
  console.log('Received request to /generate-english-reply');
  try {
    const { from, subject, body, userHint } = req.body;
    const replyText = await generateReply(from, subject, body, userHint);
    res.json({ reply: replyText });
  } catch (error) {
    console.error("Error in generate-english-reply:", error);
    res.status(500).json({ message: 'Failed to generate English reply.' });
  }
});
app.post('/generate-arabic-reply', async (req, res) => {
    console.log('Received request to /generate-arabic-reply');
    try {
        const { from, subject, body, userHint } = req.body;
        const replyText = await generateArabicReply(from, subject, body, userHint);
        res.json({ reply: replyText });
    } catch (error) {
        console.error("Error in generate-arabic-reply:", error);
        res.status(500).json({ message: 'Failed to generate Arabic reply.' });
    }
});
app.post('/translate-reply', async (req, res) => {
    console.log('Received request to /translate-reply');
    try {
        const { textToTranslate } = req.body;
        const translatedText = await translateText(textToTranslate);
        console.log('Translation successful.');
        res.json({ translatedText: translatedText });
    } catch (error) {
        console.error("Error during translation:", error);
        res.status(500).json({ message: 'Failed to translate reply.' });
    }
});
app.post('/send-email', async (req, res) => {
    console.log('Received request to /send-email');
    try {
        const auth = await authorize();
        const gmail = google.gmail({ version: 'v1', auth });
        const { from, toHeader, subject, replyBody, threadId, originalMessageId } = req.body;
        const emailLines = [ `Content-Type: text/plain; charset="UTF-8"`, `MIME-Version: 1.0`, `Content-Transfer-Encoding: 7bit`, `To: ${from}`, `From: ${toHeader}`, `Subject: Re: ${subject}`, `In-Reply-To: ${originalMessageId}`, `References: ${originalMessageId}`, '', replyBody ];
        const email = emailLines.join('\n');
        const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedEmail, threadId: threadId } });
        console.log('Email sent successfully! Now marking as read.');
        await gmail.users.threads.modify({ userId: 'me', id: threadId, requestBody: { removeLabelIds: ['UNREAD'] } });
        console.log('Thread marked as read.');
        res.status(200).send({ message: 'Email sent and marked as read successfully!' });
    } catch (error) {
        console.error('Error in send-email process:', error);
        res.status(500).send({ message: 'Error during the send email process.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});