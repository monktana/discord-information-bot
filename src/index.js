import { readdirSync } from 'fs';
import { Client, Collection, Intents } from 'discord.js';

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.commands = new Collection();
const commandFiles = readdirSync('./src/commands').filter(file => file.endsWith('.js'));

await Promise.all(commandFiles.map(async (file) => {
	const command = await import(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}));

const eventFiles = readdirSync('./src/events').filter(file => file.endsWith('.js'));

await Promise.all(eventFiles.map(async (file) => {
	const event = await import(`./events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}));

client.login(process.env.DISCORD_TOKEN);