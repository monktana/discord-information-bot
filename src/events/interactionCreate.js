export const name = 'interactionCreate';
export const once = false;
export async function execute(interaction) {
  if (!interaction.isCommand()) { return; }

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) { return; }

  try {
    await command.execute(interaction);
  } catch (error) {
    await interaction.editReply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
}
