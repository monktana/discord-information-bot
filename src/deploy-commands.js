import { readdirSync } from 'fs';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

const commands = [];
const commandFiles = readdirSync('./src/commands').filter(file => file.endsWith('.js'));

await Promise.all(commandFiles.map(async (file) => {
	const command = await import(`./commands/${file}`);
	commands.push(command.data.toJSON());
}));

const rest = new REST({ version: process.env.DISCORD_API_VERSION }).setToken(process.env.DISCORD_TOKEN);

rest.put(Routes.applicationGuildCommands(process.env.CLIENT, process.env.GUILD), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);