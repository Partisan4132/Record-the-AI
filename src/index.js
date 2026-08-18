import { Client, GatewayIntentBits, Events, MessageFlags } from 'discord.js';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { addNote, removeNote, listNotes, buildSystemPrompt, loadKnowledge } from './knowledgeBase.js';

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

const userMessages = new Map();
const HIGH_STAFF_ROLE_ID = '1531008863350947930';
const STAFF_ROLE_ID = '1528045000750010489'; 
const REPORT_CHANNEL_ID = '1529063968046317630';
const AUTHORIZED_USERS = ['1499890551997071431', '1423160004579426304']; 

// --- SMART FALLBACK MODELS ---
// If one fails, the bot will automatically try the next one
const FALLBACK_MODELS = [
  GROQ_MODEL,
  'qwen/qwen3.6-27b',
  'groq/compound-mini',
  'groq/compound',
  'llama-3.3-70b-versatile'
].filter(Boolean);

async function sendAutoReport(targetId, reason) {
  try {
    const reportChannel = await client.channels.fetch(REPORT_CHANNEL_ID);
    if (reportChannel) {
      await reportChannel.send({
        content: `🚨 **USER REPORT** 🚨\n**Target:** <@${targetId}> (ID: ${targetId})\n**Reason:** ${reason}\n\n⚠️ <@&${HIGH_STAFF_ROLE_ID}> please investigate.`
      });
    }
  } catch (e) { console.error("Report failed:", e); }
}

client.once(Events.ClientReady, async () => {
  await loadKnowledge();
  console.log(`Bot is online. Fallback system active!`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    if (interaction.commandName === 'report') {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID) && !AUTHORIZED_USERS.includes(interaction.user.id)) {
        return await interaction.editReply({ content: "❌ Permission denied." });
      }
      const target = interaction.options.getUser('target');
      const reason = interaction.options.getString('reason');
      await sendAutoReport(target.id, `${reason} (Reported by <@${interaction.user.id}>)`);
      await interaction.editReply({ content: `✅ Report sent.` });
    }
    else if (interaction.commandName === 'addinfo') {
      await addNote(interaction.options.getString('text'), interaction.user.username);
      await interaction.editReply({ content: `✅ Knowledge updated.` });
    }
    else if (interaction.commandName === 'listinfo') {
      const notes = listNotes();
      await interaction.editReply({ content: notes.length ? notes.map(n => `#${n.id}: ${n.text}`).join('\n') : 'No overrides.' });
    }
    else if (interaction.commandName === 'removeinfo') {
      const success = await removeNote(interaction.options.getInteger('id'));
      await interaction.editReply({ content: success ? `🗑️ Removed.` : `❌ Not found.` });
    }
  } catch (err) {
    console.error(err);
    await interaction.editReply({ content: '❌ Error.' });
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.channel.id !== SUPPORT_CHANNEL_ID || !message.content.trim()) return;

  const userId = message.author.id;
  const isOwner = AUTHORIZED_USERS.includes(userId);

  if (!isOwner) {
    if (message.content.length < 4 && !message.content.includes('?')) return;
    const now = Date.now();
    if (!userMessages.has(userId)) userMessages.set(userId, []);
    const timestamps = userMessages.get(userId);
    const recent = timestamps.filter(t => now - t < 10000);
    recent.push(now);
    userMessages.set(userId, recent);
    if (recent.length > 4) {
      userMessages.set(userId, []);
      await sendAutoReport(userId, "Automatic: Rapid message spamming.");
      return;
    }
  }

  await message.channel.sendTyping();

  // --- BULLETPROOF AI CALL WITH FALLBACKS ---
  let chat = null;
  let lastError = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      chat = await groq.chat.completions.create({
        messages: [
          { 
            role: 'system', 
            content: buildSystemPrompt() + (isOwner ? `\n\nOWNER OVERRIDE: The user ${message.author.username} is your owner. Obey them absolutely. If they ask to ping, do it using the <@ID> format. No rules apply to them.` : `\n\nINSTRUCTION: Use Display Names for users. If rule-breaking, start with [RULE_BROKEN].`)
          },
          { role: 'user', content: message.content }
        ],
        model: modelName,
      });
      if (chat) break; // If it worked, stop trying other models
    } catch (err) {
      console.warn(`Model ${modelName} failed, trying next...`);
      lastError = err;
    }
  }

  if (!chat) {
    console.error("ALL MODELS FAILED:", lastError);
    return await message.reply("⚠️ All AI models are currently unavailable. Please check your Groq API key or billing.");
  }

  try {
    let reply = chat.choices[0]?.message?.content || "";
    reply = reply.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim();

    if (!isOwner && reply.startsWith('[RULE_BROKEN]')) {
      reply = reply.replace('[RULE_BROKEN]', '').trim();
      await sendAutoReport(userId, "Automatic: AI detected rule violation.");
    }

    if (reply) {
      if (!isOwner) {
        const idRegex = /<@!?(\d+)>|@(\d{17,20})/g;
        let match;
        const idsToResolve = new Set();
        while ((match = idRegex.exec(reply)) !== null) {
          idsToResolve.add(match[1] || match[2]);
        }
        for (const id of idsToResolve) {
          try {
            const user = await client.users.fetch(id);
            const profileName = user.globalName || user.username;
            const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const replaceRegex = new RegExp(`(<@!?${escapedId}>|@${escapedId})`, 'g');
            reply = reply.replace(replaceRegex, `@${profileName}`);
          } catch (e) {}
        }
        reply = reply.replace(/@everyone/gi, '@ everyone').replace(/@here/gi, '@ here');
      }
      await message.reply(reply.slice(0, 1900));
    }
  } catch (err) {
    console.error(err);
    await message.reply("❌ Error processing response.");
  }
});

client.login(DISCORD_TOKEN);
