// C:\email-responder-app\backend\get-new-token.js

const fs = require('fs').promises;
const path = require('path');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// The SCOPES define what permissions the app is asking for.
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify'
];

// The path to your files.
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

/**
 * This function will trigger the Google Authentication flow,
 * open your browser, and save the new token.json file.
 */
async function generateNewToken() {
    console.log('Starting authentication process...');
    
    // The authenticate() function from the library handles everything.
    const client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });

    if (client.credentials) {
        console.log('Authentication successful! Saving new token...');
        // Save the credentials (the token) to the token.json file.
        await fs.writeFile(TOKEN_PATH, JSON.stringify(client.credentials));
        console.log('SUCCESS! New token.json file has been saved.');
        console.log('You can now copy its content to Render.');
    } else {
        console.log('Authentication failed. No credentials received.');
    }
}

// Run the function.
generateNewToken().catch(console.error);