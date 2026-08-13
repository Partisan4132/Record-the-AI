import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('addinfo')
    .setDescription('Add high-priority info or behavior rules to the bot')
    .addStringOption(option => 
      option.setName('text')
        .setDescription('The information or rule to add')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('listinfo')
    .setDescription('List all high-priority overrides'),

  new SlashCommandBuilder()
    .setName('removeinfo')
    .setDescription('Remove a specific override by ID')
    .addIntegerOption(option => 
      option.setName('id')
        .setDescription('The ID of the info to remove')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('report')
    .setDescription('Staff only: Report a user to High Staff')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The user you are reporting')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Why are you reporting them?')
        .setRequired(true)),
].map(command => command.toJSON());
