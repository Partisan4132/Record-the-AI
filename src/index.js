import { Client, GatewayIntentBits, Events, MessageFlags } from 'discord.js';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { addNote, removeNote, listNotes, buildSystemPrompt } from './knowledgeBase.js';

dotenv.config();

const { MTUzNjQxMjMyNDI2NzY5NjE0MQ.GDAg9C.500tA7DLYoVN5qaJBpndRLD6YDXrp7CFzZm7xc, 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, 1536410198556807349, GROQ_MODEL } = process.env;

if (!MTUzNjQxMjMyNDI2NzY5NjE0MQ.GDAg9C.500tA7DLYoVN5qaJBpndRLD6YDXrp7CFzZm7xc || !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 || !1536410198556807349) {
  console.error('Missing DISCORD_TOKEN, GROQ_API_KEY, or SUPPORT_CHANNEL_ID in .env');
  process.exit(1);
}

const groq = new Groq({ apiKey: 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 });
// Free on Groq, no credit card. Swap in .env to "openai/gpt-oss-120b" for another
// free option, or "llama-3.1-8b-instant" if you want faster/lighter replies.
const MODEL = GROQ_MODEL || 'llama-3.3-70b-versatile';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}. Watching channel ${1536410198556807349}.`);
});

// ---------- Slash commands: managing the knowledge base ----------
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'addinfo') {
    const text = interaction.options.getString('text', true);
    const entry = addNote(text, interaction.user.tag);
    await interaction.reply({
      content: `Added note #${entry.id}: "${entry.text}"`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.commandName === 'listinfo') {
    const notes = listNotes();
    const body = notes.length
      ? notes
          .map((n) => `#${n.id} — ${n.text} (by ${n.author}, ${n.addedAt.slice(0, 10)})`)
          .join('\n')
      : 'No notes added yet — the bot is running on the base knowledge file only.';
    await interaction.reply({ content: body, flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === 'removeinfo') {
    const id = interaction.options.getInteger('id', true);
    const ok = removeNote(id);
    await interaction.reply({
      content: ok ? `Removed note #${id}.` : `No note with ID #${id} found. Check /listinfo.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
});

// ---------- Support channel Q&A ----------
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== 1536410198556807349) return;
  if (!message.content.trim()) return;

  await message.channel.sendTyping();

  try {
    // Pull a bit of recent history so follow-up questions have context.
    const recent = await message.channel.messages.fetch({ limit: 6, before: message.id });
    const history = [...recent.values()]
      .reverse()
      .filter((m) => m.content?.trim())
      .map((m) => ({
        role: m.author.bot ? 'assistant' : 'user',
        content: m.author.bot ? m.content : `${m.author.username}: ${m.content}`,
      }));

    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 700,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        ...history,
        { role: 'user', content: `${message.author.username}: ${message.content}` },
      ],
    });

    const reply = (completion.choices[0]?.message?.content ?? '').slice(0, 1900); // Discord's message length limit is 2000 chars

    if (reply) await message.reply(reply);
  } catch (err) {
    console.error('Error answering support question:', err);
    if (err?.status === 429) {
      await message.reply(
        "I've hit the free API's rate limit for the moment — try again in a bit."
      );
    } else {
      await message.reply('Sorry, I hit an error trying to answer that — try again in a moment.');
    }
  }
});

client.login(MTUzNjQxMjMyNDI2NzY5NjE0MQ.GDAg9C.500tA7DLYoVN5qaJBpndRLD6YDXrp7CFzZm7xc);
