import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';
import dotenv from 'dotenv';

dotenv.config();

const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    
    // This registers the commands globally
    await rest.put(
      Routes.applicationCommands(DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log(`Successfully registered ${commands.length} command(s).`);
  } catch (error) {
    console.error(error);
  }
})();
