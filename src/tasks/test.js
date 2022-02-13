const { MessageEmbed, WebhookClient } = require('discord.js');

const webhookClient = new WebhookClient({ id: process.env.WEBHOOK_ID, token: process.env.WEBHOOK_TOKEN});

const embed = new MessageEmbed()
	.setTitle('Some Title')
	.setColor('#0099ff');

webhookClient.send({
	content: 'Webhook test',
	username: 'some-username',
	avatarURL: 'https://i.imgur.com/AfFp7pu.png',
	embeds: [embed],
});