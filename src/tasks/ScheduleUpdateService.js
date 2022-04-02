import { MessageEmbed } from 'discord.js';
import moment from 'moment';
import got from 'got';
import { ParseHTMLToJson, AddStreamDate, AddTitle } from './ScheduleService.js';

const NOTIFICATION_TYPES = Object.freeze({
  EMBED: 1,
  TEXT: 2,
});

const NOTIFICATION_PRIORITY = Object.freeze({
  HIGH: 1,
  MEDIUM: 50,
  LOW: 100,
});

const NOTIFICATIONS = {
  date: {
    type: NOTIFICATION_TYPES.TEXT,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    message: 'The stream now starts at: #1',
    compare: (current, cached) => !current.date.isSame(cached.date),
  },
  isLive: {
    type: NOTIFICATION_TYPES.EMBED,
    priority: NOTIFICATION_PRIORITY.HIGH,
    message: 'The stream just went #1',
    compare: (current, cached) => current.isLive !== cached.isLive,
  },
  title: {
    type: NOTIFICATION_TYPES.TEXT,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    message: 'The stream is now titled as: #1',
    compare: (current, cached) => current.title !== cached.title,
  },
};

export class ScheduleUpdateService {
  constructor(dependencies) {
    this.dependencies = dependencies;
  }

  async update() {
    const streams = await this.scheduleService.get(this.dependencies.logger);
    const changedStreams = [];

    this.dependencies.redis.connect();

    const promises = streams.map(async (stream) => {
      const cachedStream = await this.dependencies.redis.json.get(stream.link, '.');

      if (!cachedStream) {
        this.dependencies.logger.info('New stream', { stream });
        this.dependencies.redis.json.set(stream.link, '.', stream);

        return;
      }

      cachedStream.date = moment(cachedStream.date);
      let changes = this.streamHasChanges(cachedStream, stream);
      if (changes.length === 0) {
        this.dependencies.logger.info('No changed detected', { old: cachedStream, new: stream });
        return;
      }

      changes = changes.sort((first, second) => NOTIFICATIONS[first].priority - NOTIFICATIONS[second].priority);
      const { type } = NOTIFICATIONS[changes[0]];

      changedStreams.push({ stream, changes, type });
      this.dependencies.logger.info('Properties of a stream changed', { old: cachedStream, new: stream, changes });

      this.dependencies.redis.json.set(stream.link, '.', stream);
    });

    await Promise.all(promises);

    return changedStreams;
  }

  streamHasChanges(cached, stream) {
    return Object.keys(NOTIFICATIONS).filter((key) => NOTIFICATIONS[key].compare(stream, cached));
  }
}

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
