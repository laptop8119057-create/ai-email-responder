// C:\email-responder\backend\generate-reply.js

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// --- THIS IS THE FINAL, GUARANTEED ARABIC CLEANUP AND FORMATTING FUNCTION ---
function cleanAndFinalizeArabic(rawText) {
  // This is a strict "whitelist" of all allowed character sets.
  const arabicChars = "ابتثجحخدذرزسشصضطظعغفقكلمنهويىءآأؤإئًٌٍَُِّْ";
  const easternNumerals = "٠١٢٣٤٥٦٧٨٩";
  const westernNumerals = "0123456789"; // Allow western numerals initially, we will convert them.
  const allowedPunctuation = " .,'\"`-،؛؟()\n"; // \n allows for new lines
  
  let cleanedText = "";

  // 1. Iterate character by character and build a new string with ONLY allowed characters.
  // This is a guaranteed filter that destroys any non-Arabic/non-numeric characters.
  for (const char of rawText) {
    if (arabicChars.includes(char) || easternNumerals.includes(char) || westernNumerals.includes(char) || allowedPunctuation.includes(char)) {
      cleanedText += char;
    }
  }

  // 2. Perform the guaranteed Western-to-Eastern numeral conversion on the clean text.
  let finalText = cleanedText;
  const westernArabicNumerals = [/0/g, /1/g, /2/g, /3/g, /4/g, /5/g, /6/g, /7/g, /8/g, /9/g];
  const easternArabicNumeralsArr = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  for (let i = 0; i < westernArabicNumerals.length; i++) {
    finalText = finalText.replace(westernArabicNumerals[i], easternArabicNumeralsArr[i]);
  }
  
  // 3. Programmatically enforce the closing format.
  const closingPhrase = "مع خالص التقدير، أليكس";
  const correctClosing = "مع خالص التقدير،\nأليكس";
  if (finalText.includes(closingPhrase)) {
    finalText = finalText.replace(closingPhrase, correctClosing);
  }
  
  return finalText.trim();
}

// English generation function (Unchanged and Correct)
async function generateReply(from, subject, body, userHint) {
  // ... (This function is unchanged)
  try {
    const senderFirstName = from.split('<')[0].trim().split(' ')[0] || 'there';
    const prompt = `
      You are a world-class executive assistant. Your task is to write the BODY ONLY of a professional, clear, and concise email reply based on a hint.
      RULES:
      1. DO NOT include a "Subject:" line.
      2. Start directly with the salutation "Dear ${senderFirstName},".
      3. Sign off with "Thank you," on a new line, followed by "Alex" on the next line.
      INSTRUCTION: "${userHint}"
    `;
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
      temperature: 0.7,
      max_tokens: 200,
    });
    return chatCompletion.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error calling AI service for English generation:", error);
    return `An error occurred while generating the English reply.`;
  }
}

// Arabic generation function (Now uses the final foolproof cleanup)
async function generateArabicReply(from, subject, body, userHint) {
  const senderFirstName = from.split('<')[0].trim().split(' ')[0] || '';

  // A simplified, direct prompt
  const arabicCeoPrompt = `
    You are an expert Arabic copywriter for a CEO. Your task is to compose the BODY ONLY of a professional Arabic email.
    The recipient's first name is: ${senderFirstName}
    Your instruction is: "${userHint}"
    Compose a professional, high-quality Arabic email body based on the instruction.
    - Start with a suitable Arabic salutation addressing the recipient by name.
    - Write the main body of the email.
    - End with a professional closing and the name "أليكس".
    - Your entire response MUST be in Arabic only.
  `;
  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: arabicCeoPrompt }],
      model: 'llama3-8b-8192',
      temperature: 0.6,
      max_tokens: 300,
    });
    const rawAiResponse = chatCompletion.choices[0].message.content.trim();
    console.log("Raw Arabic Generation Response:", rawAiResponse);
    
    // Applying the foolproof cleanup
    const finalReply = cleanAndFinalizeArabic(rawAiResponse);
    console.log("Final Cleaned Arabic Generation:", finalReply);
    
    if (finalReply) {
      return finalReply;
    } else {
      return "Error: Could not generate a valid Arabic response.";
    }
  } catch (error) {
    console.error("Error in generateArabicReply:", error);
    return "An error occurred while generating the Arabic reply.";
  }
}

// Translation function (Now uses the foolproof cleanup)
async function translateText(textToTranslate) {
  const ceoLevelTranslationPrompt = `
    You are a professional and highly skilled Arabic translator. Your task is to translate the following English message into perfect, grammatically accurate, and contextually appropriate Arabic. Your final output must be ONLY the pure, refined Arabic text.
  `;
  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: ceoLevelTranslationPrompt }, { role: 'user', content: `Translate this: "${textToTranslate}"` }],
      model: 'llama3-8b-8192',
      temperature: 0.2,
    });
    const rawAiResponse = chatCompletion.choices[0].message.content.trim();
    console.log("Raw Translation Response:", rawAiResponse);

    // Applying the foolproof cleanup
    const finalTranslation = cleanAndFinalizeArabic(rawAiResponse);
    console.log("Final Cleaned Translation:", finalTranslation);

    if (finalTranslation) {
      return finalTranslation;
    } else {
      return "Translation Error: Could not process AI response.";
    }
  } catch (error) {
    console.error("Error during translation:", error);
    return "Translation Error.";
  }
}

module.exports = { generateReply, generateArabicReply, translateText };