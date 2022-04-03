import { MessageEmbed } from 'discord.js';
import { NOTIFICATIONS, NOTIFICATION_TYPES } from "../notifications.js";

export class DiscordNotificationService {
  constructor(dependencies) {
    this.dependencies = dependencies;
  }

  sendNotifications(notifications) {
    notifications.forEach((notification) => {
      if (notification.type === NOTIFICATION_TYPES.TEXT) {
        this.sendTextNotification(notification);
      }

      if (notification.type === NOTIFICATION_TYPES.EMBED) {
        this.sendEmbedNotification(notification);
      }
    });
  }

  sendTextNotification(notification) {
    const { stream, changes } = notification;
    let message = `UPDATE: One of ${stream.name}'s streams changed:`;

    changes.forEach((change) => {
      message += `\n ${(NOTIFICATIONS[change].message).replace('#1', stream[change])}`;
    });

    this.dependencies.webhook.send({
      content: message,
      username: 'Holo-man',
      avatarURL: 'https://i.imgur.com/AfFp7pu.png',
    });
  }

  sendEmbedNotification(notification) {
    const { stream } = notification;
    const statusMessage = stream.isLive ? 'Live' : 'Offline';

    const embed = new MessageEmbed()
      .setColor(stream.isLive ? '#f00a2c' : '#bab8b9')
      .setTitle(stream.title)
      .setURL(stream.link)
      .setAuthor({ name: stream.name, iconURL: stream.icon })
      .addField('Status', NOTIFICATIONS.isLive.message.replace('#1', statusMessage))
      .setImage(stream.thumbnail)
      .setTimestamp();

    this.dependencies.webhook.send({
      content: `${stream.name}'s stream just went ${statusMessage}`,
      username: 'Holo-man',
      avatarURL: 'https://i.imgur.com/AfFp7pu.png',
      embeds: [embed],
    });
  }
}