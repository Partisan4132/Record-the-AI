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

// --- CONFIGURATION ---
const userMessages = new Map();
const HIGH_STAFF_ROLE_ID = '1531008863350947930';
const REPORT_CHANNEL_ID = '1529063968046317630'; // Reports go here now

// --- HELPER: SEND STRUCTURED MODERATION REPORT ---
async function sendAutoReport(targetId, reason) {
  try {
    const reportChannel = await client.channels.fetch(REPORT_CHANNEL_ID);
    if (reportChannel) {
      await reportChannel.send({
        content: `🚨 **AUTOMATIC MODERATION REPORT** 🚨\n**System Action:** Auto-Flagged\n**Target:** <@${targetId}> (ID: ${targetId})\n**Reason:** ${reason}\n\n⚠️ <@&${HIGH_STAFF_ROLE_ID}> please investigate.`
      });
    }
  } catch (e) {
    console.error("Failed to send report:", e);
  }
}

client.once(Events.ClientReady, async () => {
  await loadKnowledge();
  console.log(`Logged in as ${client.user.tag}. Reporting to channel ${REPORT_CHANNEL_ID}!`);
});

// --- SLASH COMMAND HANDLERS ---
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    if (interaction.commandName === 'addinfo') {
      const text = interaction.options.getString('text');
      await addNote(text, interaction.user.username);
      await interaction.editReply({ content: `✅ **Knowledge updated instantly.** I've prioritized this info in my memory!` });
    } 
    else if (interaction.commandName === 'listinfo') {
      const notes = listNotes();
      const reply = notes.length 
        ? notes.map(n => `**#${n.id}** (${n.author}): ${n.text.slice(0, 100)}`).join('\n') 
        : 'No overrides found.';
      await interaction.editReply({ content: reply.slice(0, 2000) });
    } 
    else if (interaction.commandName === 'removeinfo') {
      const id = interaction.options.getInteger('id');
      const success = await removeNote(id);
      await interaction.editReply({ content: success ? `🗑️ Removed info #${id}.` : `❌ Info #${id} not found.` });
    }
    else if (interaction.commandName === 'report') {
      const target = interaction.options.getUser('target');
      const reason = interaction.options.getString('reason');
      await sendAutoReport(target.id, `Manual Report: ${reason} (by <@${interaction.user.id}>)`);
      await interaction.editReply({ content: `✅ Report sent to the staff channel.` });
    }
    else if (interaction.commandName === 'test-report') {
      await sendAutoReport(interaction.user.id, "Manual System Test (Triggered by user)");
      await interaction.editReply({ content: `✅ **Test Successful.** I have sent a report for you to the staff channel.` });
    }
  } catch (err) {
    console.error(err);
    await interaction.editReply({ content: '❌ Error processing command.' });
  }
});

// --- MAIN AI CHAT & MODERATION LOGIC ---
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.channel.id !== SUPPORT_CHANNEL_ID || !message.content.trim()) return;

  // SMART FILTER: Ignore junk under 4 characters
  if (message.content.length < 4 && !message.content.includes('?')) return;

  const userId = message.author.id;
  const now = Date.now();

  // --- SPAM DETECTION ---
  if (!userMessages.has(userId)) userMessages.set(userId, []);
  const timestamps = userMessages.get(userId);
  const recentTimestamps = timestamps.filter(t => now - t < 10000);
  recentTimestamps.push(now);
  userMessages.set(userId, recentTimestamps);

  if (recentTimestamps.length > 4) {
    userMessages.set(userId, []);
    await sendAutoReport(userId, "Rapid message spamming (5+ messages in 10s)");
    return;
  }

  // --- AI RESPONSE ---
  await message.channel.sendTyping();
  try {
    const chat = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: buildSystemPrompt() + `\n\nMODERATION INSTRUCTION: If the user is breaking rules (severe toxicity, trolling, abuse), start your response with [RULE_BROKEN].` 
        }, 
        { role: 'user', content: message.content }
      ],
      model: GROQ_MODEL || 'llama-3.3-70b-versatile',
    });

    let reply = chat.choices[0]?.message?.content || "";

    if (reply.startsWith('[RULE_BROKEN]')) {
      reply = reply.replace('[RULE_BROKEN]', '').trim();
      await sendAutoReport(userId, `AI Detection: Potential rule violation in message.`);
    }

    if (reply) {
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
