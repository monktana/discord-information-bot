import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('test command');

export async function execute(interaction) {
  await interaction.reply('pong!');
}
