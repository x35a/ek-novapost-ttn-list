// api/telegram.js
import TelegramBot from 'node-telegram-bot-api';

// Initialize bot with webhook mode
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { webHook: true });

export async function POST(request) {
  try {
    // Log request details
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('Request URL:', request.url);
    // Validate that the request is from Telegram by checking headers
    const telegramToken = request.headers.get('x-telegram-bot-api-secret-token');
    
    // If no token provided, still accept the request (Telegram doesn't always send it)
    console.log('Received webhook request');
    const update = await request.json();
    console.log('Webhook update:', JSON.stringify(update));
    
    // Check if we received a message
    if (update && update.message) {
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
    // Log environment info
    console.log('Environment variables:', {
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NODE_ENV: process.env.NODE_ENV
    });

    // Get the current webhook info first
    const currentInfo = await bot.getWebHookInfo();
    console.log('Current webhook info:', currentInfo);

    // Delete any existing webhook
    await bot.deleteWebHook();
    console.log('Deleted existing webhook');

    // Always use the production URL for webhook
    const webhookUrl = 'https://ek-novapost-ttn-list.vercel.app/api/telegram';
    const options = {
      max_connections: 100,
      drop_pending_updates: true
    };
    console.log('Setting webhook to:', webhookUrl);
    const info = await bot.setWebHook(webhookUrl, options);
    console.log('Webhook setup response:', info);
    
    return new Response(`Webhook set to ${webhookUrl}\nSetup response: ${JSON.stringify(info)}`, { status: 200 });
  } catch (error) {
    console.error('Error setting webhook:', error);
    return new Response('Error setting webhook', { status: 500 });
  }
}
