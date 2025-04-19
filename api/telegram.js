// api/telegram.js
import TelegramBot from 'node-telegram-bot-api';

// Initialize bot with webhook mode
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { webHook: true });

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
export async function GET(request) {
  try {
    const webhookUrl = `${process.env.VERCEL_URL}/api/telegram`;
    console.log('Setting webhook to:', webhookUrl);
    const info = await bot.setWebHook(webhookUrl);
    console.log('Webhook setup response:', info);
    return new Response(`Webhook set to ${webhookUrl}\nSetup response: ${JSON.stringify(info)}`, { status: 200 });
  } catch (error) {
    console.error('Error setting webhook:', error);
    return new Response('Error setting webhook', { status: 500 });
  }
}
