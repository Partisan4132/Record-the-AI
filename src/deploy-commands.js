import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { commands } from './commands.js';

dotenv.config();

const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

try {
  console.log('Registering slash commands...');
  await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
  console.log(`Registered ${commands.length} command(s): ${commands.map((c) => c.name).join(', ')}`);
} catch (err) {
  console.error('Failed to register commands:', err);
  process.exit(1);
}
