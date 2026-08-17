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

async function sendAutoReport(targetId, reason) {
  try {
    const reportChannel = await client.channels.fetch(REPORT_CHANNEL_ID);
    if (reportChannel) {
      await reportChannel.send({
        content: `🚨 **USER REPORT** 🚨\n**Target:** <@${targetId}> (ID: ${targetId})\n**Reason:** ${reason}\n\n⚠️ <@&${HIGH_STAFF_ROLE_ID}> please investigate.`
      });
    }
  } catch (e) {
    console.error("Failed to send report:", e);
  }
}

client.once(Events.ClientReady, async () => {
  await loadKnowledge();
  console.log(`Bot is online. Mentions will now resolve to Profile Names!`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    if (interaction.commandName === 'report') {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        return await interaction.editReply({ content: "❌ You do not have permission to use this command." });
      }
      const target = interaction.options.getUser('target');
      const reason = interaction.options.getString('reason');
      await sendAutoReport(target.id, `${reason} (Reported by <@${interaction.user.id}>)`);
      await interaction.editReply({ content: `✅ Report for ${target.username} sent.` });
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
  if (message.content.length < 4 && !message.content.includes('?')) return;

  const userId = message.author.id;
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

  await message.channel.sendTyping();
  try {
    const chat = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: buildSystemPrompt() + `\n\nINSTRUCTION: If you mention users, use their Display Names. Refer to high-priority notes as "Community Notes". Use Discord Markdown (**bold**) instead of HTML. If a user is breaking rules, start with [RULE_BROKEN].` 
        },
        { role: 'user', content: message.content }
      ],
      model: GROQ_MODEL || 'llama-3.3-70b-versatile',
    });

    let reply = chat.choices[0]?.message?.content || "";
    
    if (reply.startsWith('[RULE_BROKEN]')) {
      reply = reply.replace('[RULE_BROKEN]', '').trim();
      await sendAutoReport(userId, "Automatic: AI detected rule violation.");
    }

    if (reply) {
      // --- PROFILE NAME RESOLVER ---
      const idRegex = /<@!?(\d+)>|@(\d{17,20})/g;
      let match;
      const idsToResolve = new Set();
      while ((match = idRegex.exec(reply)) !== null) {
        idsToResolve.add(match[1] || match[2]);
      }

      for (const id of idsToResolve) {
        try {
          const user = await client.users.fetch(id);
          // Use Profile Name (globalName) if available, otherwise username
          const profileName = user.globalName || user.username;
          const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const replaceRegex = new RegExp(`(<@!?${escapedId}>|@${escapedId})`, 'g');
          reply = reply.replace(replaceRegex, `@${profileName}`);
        } catch (e) {
          // Keep ID if user not found
        }
      }

      const safeReply = reply.replace(/@everyone/gi, '@ everyone').replace(/@here/gi, '@ here');
      await message.reply(safeReply.slice(0, 1900));
    }
  } catch (err) {
    console.error(err);
    await message.reply("Error. Check logs.");
  }
});

client.login(DISCORD_TOKEN);
