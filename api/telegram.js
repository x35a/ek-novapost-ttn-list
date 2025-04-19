// api/telegram.js
import TelegramBot from 'node-telegram-bot-api';

// Initialize bot with webhook mode
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { webHook: true });

export async function POST(request) {
  try {
    const update = await request.json();
    
    // Check if we received a message
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // Echo the received message (replace with your bot logic)
      await bot.sendMessage(chatId, `You said: ${text}`);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error handling telegram webhook:', error);
    return new Response('Error', { status: 500 });
  }
}

// This endpoint can be used to set up the webhook
export async function GET(request) {
  try {
    const webhookUrl = `${process.env.VERCEL_URL}/api/telegram`;
    await bot.setWebHook(webhookUrl);
    return new Response(`Webhook set to ${webhookUrl}`, { status: 200 });
  } catch (error) {
    console.error('Error setting webhook:', error);
    return new Response('Error setting webhook', { status: 500 });
  }
}
