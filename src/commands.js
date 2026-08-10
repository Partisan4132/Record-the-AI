import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

// These three commands are restricted to members with "Manage Server" permission by
// default (i.e. your mods/admins) since anything added here shapes what the bot tells
// people as fact. Adjust .setDefaultMemberPermissions(...) if you want a different bar.

export const commands = [
  new SlashCommandBuilder()
    .setName('addinfo')
    .setDescription("Add a fact to the support bot's knowledge base")
    .addStringOption((opt) =>
      opt.setName('text').setDescription('The information to add').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('listinfo')
    .setDescription('List notes that have been added to the knowledge base')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('removeinfo')
    .setDescription('Remove a note from the knowledge base by ID')
    .addIntegerOption((opt) =>
      opt.setName('id').setDescription('The note ID — see /listinfo').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
].map((c) => c.toJSON());
