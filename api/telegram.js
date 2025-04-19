// api/telegram.js
import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';

// Initialize bot with webhook mode
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { webHook: true });

// Function to verify Telegram webhook request
function verifyTelegramWebhook(request, secretToken) {
  if (!request.headers) return false;
  
  const telegramHash = request.headers.get('x-telegram-bot-api-secret-token');
  return telegramHash === secretToken;
}

export async function POST(request) {
  try {
    console.log('Received webhook request');
    const update = await request.json();
    console.log('Webhook update:', JSON.stringify(update));
    
    // Check if we received a message
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      console.log(`Received message from chat ${chatId}: ${text}`);

      // Echo the received message (replace with your bot logic)
      await bot.sendMessage(chatId, `You said: ${text}`);
      console.log('Response sent successfully');
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error handling telegram webhook:', error);
    return new Response('Error', { status: 500 });
  }
}

// This endpoint can be used to set up the webhook
// Endpoint to delete existing webhook
export async function DELETE(request) {
  try {
    const info = await bot.deleteWebHook();
    return new Response(`Webhook deleted: ${JSON.stringify(info)}`, { status: 200 });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return new Response('Error deleting webhook', { status: 500 });
  }
}

export async function GET(request) {
  try {
    // Generate a secret token for webhook verification
    const secretToken = crypto.randomBytes(20).toString('hex');
    const webhookUrl = `${process.env.VERCEL_URL}/api/telegram`;
    const options = {
      secret_token: secretToken
    };
    console.log('Setting webhook to:', webhookUrl);
    const info = await bot.setWebHook(webhookUrl, options);
    console.log('Webhook setup response:', info);
    // Store the secret token somewhere secure or display it (for testing)
    return new Response(`Webhook set to ${webhookUrl}\nSetup response: ${JSON.stringify(info)}`, { status: 200 });
  } catch (error) {
    console.error('Error setting webhook:', error);
    return new Response('Error setting webhook', { status: 500 });
  }
}
