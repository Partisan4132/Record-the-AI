import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { commands } from './commands.js';

dotenv.config();

const { MTUzNjQxMjMyNDI2NzY5NjE0MQ.GDAg9C.500tA7DLYoVN5qaJBpndRLD6YDXrp7CFzZm7xc, 1536412324267696141 } = process.env;

if (!MTUzNjQxMjMyNDI2NzY5NjE0MQ.GDAg9C.500tA7DLYoVN5qaJBpndRLD6YDXrp7CFzZm7xc || !1536412324267696141) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(MTUzNjQxMjMyNDI2NzY5NjE0MQ.GDAg9C.500tA7DLYoVN5qaJBpndRLD6YDXrp7CFzZm7xc);

try {
  console.log('Registering slash commands...');
  await rest.put(Routes.applicationCommands(1536412324267696141), { body: commands });
  console.log(`Registered ${commands.length} command(s): ${commands.map((c) => c.name).join(', ')}`);
} catch (err) {
  console.error('Failed to register commands:', err);
  process.exit(1);
}
