import { Client, GatewayIntentBits, Events } from 'discord.js';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { buildSystemPrompt, loadKnowledge } from './knowledgeBase.js';

dotenv.config();

const { DISCORD_TOKEN, GROQ_API_KEY, SUPPORT_CHANNEL_ID, GROQ_MODEL } = process.env;
const groq = new Groq({ apiKey: GROQ_API_KEY });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

// Moderation tracking (Spam detection map: userId -> [timestamps])
const userMessages = new Map();
const HIGH_STAFF_ROLE_ID = '1531008863350947930';

client.once(Events.ClientReady, async () => {
  await loadKnowledge();
  console.log("Bot is online with High Staff moderation active!");
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.channel.id !== SUPPORT_CHANNEL_ID || !message.content.trim()) return;

  const userId = message.author.id;
  const now = Date.now();

  // --- 1. SPAM DETECTION ---
  if (!userMessages.has(userId)) userMessages.set(userId, []);
  const timestamps = userMessages.get(userId);
  
  // Keep only timestamps from the last 10 seconds
  const recentTimestamps = timestamps.filter(t => now - t < 10000);
  recentTimestamps.push(now);
  userMessages.set(userId, recentTimestamps);

  // If user sent more than 4 messages in 10 seconds = SPAM
  if (recentTimestamps.length > 4) {
    userMessages.set(userId, []); // Reset
    try {
      await message.reply(`⚠️ <@&${HIGH_STAFF_ROLE_ID}> Potential spam detected from <@${userId}>! Please check this channel.`);
    } catch (e) {
      console.error("Failed to send spam alert:", e);
    }
    return;
  }

  // --- 2. AI SUPPORT & RULE CHECKING ---
  await message.channel.sendTyping();
  try {
    const chat = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: buildSystemPrompt() + `\n\nMODERATION INSTRUCTION: Analyze if the user's message is breaking server rules (trolling, severe toxicity, abuse). If they are breaking rules, start your response with "[RULE_BROKEN]" followed by your normal helpful or sarcastic reply.` 
        }, 
        { role: 'user', content: message.content }
      ],
      model: GROQ_MODEL || 'llama-3.3-70b-versatile',
    });

    let reply = chat.choices[0]?.message?.content || "";

    // Check if AI flagged a rule violation
    if (reply.startsWith('[RULE_BROKEN]')) {
      reply = reply.replace('[RULE_BROKEN]', '').trim();
      // Append High Staff ping to the response
      reply += `\n\n⚠️ <@&${HIGH_STAFF_ROLE_ID}> Staff attention requested regarding this behavior.`;
    }

    if (reply) {
      // Automatic anti-ping protection for output
      const safeReply = reply
        .replace(/@everyone/gi, '@ everyone')
        .replace(/@here/gi, '@ here')
        .replace(/<@!?(\d+)>/g, '@ $1')
        .replace(/@(\d+)/g, '@ $1');

      await message.reply(safeReply.slice(0, 1900));
    }
  } catch (err) {
    console.error(err);
    await message.reply("I hit a limit or error. Check the logs.");
  }
});

client.login(DISCORD_TOKEN);
