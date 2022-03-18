import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('test command');

export async function execute(interaction: any) {
  await interaction.reply('pong!');
}