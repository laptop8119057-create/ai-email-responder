# AI Email Co-pilot

An intelligent web application that reads unread Gmail messages, uses a powerful AI to draft contextual replies based on user hints, and allows for one-click sending to streamline email management.

## ✨ Key Features

-   **Live Email Reading:** Fetches unread emails from a connected Gmail account in real-time.
-   **AI Co-pilot:** Instead of static templates, a "Generate with Hint" button allows the user to provide instructions. The AI then writes a full, professional email based on the context and the hint.
-   **Full User Control:** All AI-generated drafts can be edited directly in the user interface before sending.
-   **One-Click Sending:** Send the finalized reply with a single button click.
-   **Mark as Read:** Automatically marks the email thread as "read" after a reply is sent, clearing it from the user's queue.
-   **Dynamic Refresh:** Check for new emails without needing to reload the page.
-   **Robust Fallback:** If the AI service fails, the app remains fully functional.

## 💻 Tech Stack

-   **Backend:** Node.js, Express.js
-   **Frontend:** HTML5, CSS3, Vanilla JavaScript
-   **Core APIs:**
    -   Google Gmail API (for all email interactions)
    -   Groq API (for AI-powered text generation)

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) installed
-   A Google account
-   A [GroqCloud](https://console.groq.com/) account (for the AI service)

### Installation and Setup

1.  **Project Files:**
    - Place the project files in a directory, e.g., `C:\email-responder`.

2.  **Backend Setup:**
    - Navigate to the backend directory:
      ```bash
      cd email-responder/backend
      ```
    - Install the necessary npm packages:
      ```bash
      npm install
      ```

3.  **Configure API Keys and Credentials:**
    - **Google Credentials:** Add your Google API credentials to a `credentials.json` file in the `backend` directory.
    - **Groq API Key:** Create a `.env` file in the `backend` directory. Inside this file, add your Groq API key like so:
      ```
      OPENAI_API_KEY=gsk_YourGroqApiKeyHere
      ```
    - **Authorize Google Account:** Run the one-time authorization script. This will open a browser window for you to log in and grant permissions.
      ```bash
      node gmail-auth.js
      ```
      This will create your `token.json` file.

4.  **Run the Application:**
    - From the `backend` directory, start the server:
      ```bash
      node server.js
      ```
    - The application is now running!

5.  **Access the Web App:**
    - Open your web browser and navigate to:
      ```
      http://localhost:3000
      ```