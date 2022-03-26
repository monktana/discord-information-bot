import { MessageEmbed } from "discord.js";
import got from 'got';
import { load } from 'cheerio';
import moment from 'moment';

const NOTIFICATION_TYPES = Object.freeze({
  EMBED: 1,
  TEXT: 2
})

const NOTIFICATION_PRIORITY = Object.freeze({
  HIGH: 1,
  MEDIUM: 50,
  LOW: 100
})

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
  }
}

export class ScheduleUpdateService {
  constructor(dependencies) {
    this.dependencies = dependencies;
  }

  async update() {
    const streams = await ScheduleService.get();
    const changedStreams = []

    this.dependencies.redis.connect();

    const promises = streams.map(async (stream) => {
      const cachedStream = await this.dependencies.redis.json.get(stream.link, '.');

      if (!cachedStream) {
        this.dependencies.logger.info('New stream', {stream});
        this.dependencies.redis.json.set(stream.link, '.', stream);

        return
      }

      cachedStream.date = moment(cachedStream.date)
      let changes = this.streamHasChanges(cachedStream, stream)
      if (changes.length === 0) {
        this.dependencies.logger.info('No changed detected', {old: cachedStream, new: stream});
        return
      }

      changes = changes.sort((first, second) => NOTIFICATIONS[first].priority  - NOTIFICATIONS[second].priority)
      const type = NOTIFICATIONS[changes[0]].type

      changedStreams.push({stream, changes, type})
      this.dependencies.logger.info('Properties of a stream changed', {old: cachedStream, new: stream, changes});

      this.dependencies.redis.json.set(stream.link, '.', stream);
    })

    await Promise.all(promises);

    return changedStreams;
  }

  streamHasChanges(cached, stream) {
    return Object.keys(NOTIFICATIONS).filter(key => NOTIFICATIONS[key].compare(stream, cached));
  }
}

export class DiscordNotificationService {
  constructor(dependencies) {
    this.dependencies = dependencies;
  }
  
  sendNotifications(notifications) {
    notifications.forEach(notification => {
      if (notification.type === NOTIFICATION_TYPES.TEXT) {
        this.sendTextNotification(notification)
      }

      if (notification.type === NOTIFICATION_TYPES.EMBED) {
        this.sendEmbedNotification(notification)
      }
    });
  }

  sendTextNotification(notification) {
    const {stream, changes} = notification
    let message = `UPDATE: One of ${stream.name}'s streams changed:`

    changes.forEach(change => {
      message += `\n ${(NOTIFICATIONS[change].message).replace('#1', stream[change])}`
    });

    this.dependencies.webhook.send({
      content: message,
      username: 'Holo-man',
      avatarURL: 'https://i.imgur.com/AfFp7pu.png'
    });
  }
  
  sendEmbedNotification(notification) {
    const {stream} = notification
    let statusMessage = stream.isLive ? 'Live' : 'Offline'

    const embed = new MessageEmbed()
        .setColor(stream.isLive ? '#f00a2c' : '#bab8b9')
        .setTitle(stream.title)
        .setURL(stream.link)
        .setAuthor({ name: stream.name, iconURL: stream.icon})
        .addField('Status', NOTIFICATIONS.isLive.message.replace('#1', statusMessage))
        .setImage(stream.thumbnail)
        .setTimestamp()

    this.dependencies.webhook.send({
      content: `${stream.name}'s stream just went ${statusMessage}`,
      username: 'Holo-man',
      avatarURL: 'https://i.imgur.com/AfFp7pu.png',
      embeds: [embed],
    });
  }
}

class ScheduleService {
  constructor() {}

  static async get() {
    const content = await got.get("https://schedule.hololive.tv/lives/english", { headers: { Cookie: "timezone=UTC" }}).text();
    const $ = load(content);

    const streamLinks = $('a[href*="youtube.com"]').toArray();
    const streams = []
  
    await Promise.all(streamLinks.map(async (element) => {
      const $element = $(element);
      const $parent = $element.parent();

      if ($parent.attr('class').includes('carousel')) {
        return
      }
  
      const startTime = $element.find("div.datetime").text().trim();
      let $currentContainer = $element.closest("div.container");
      while (!$currentContainer.find("div.holodule.navbar-text").length) {
        $currentContainer = $currentContainer.prev();
      }
  
      const streamDay = $currentContainer.find("div.holodule.navbar-text").text().trim().substring(0,5);
      const dateString = `${moment().year()}-${streamDay.replace("/","-")} ${startTime}:00Z`;
      const date = moment(dateString)
  
      const link = $element.attr("href");
      const style = $element.attr("style");
      const isLive = /border:.*red/.test(style);
      const name = $element.find("div.name").text().trim();
      const thumbnail = $element.find('img[src*="img.youtube.com"]').attr("src");
      const icon = $element.find('img[src*="yt3.ggpht.com"]').attr("src");
  
      const streamPage = await got.get(link).text();
      const $yt = load(streamPage);
      const title = $yt("title").text().replace(" - YouTube", "").trim();
      
      const stream = {name, date, isLive, title, link, thumbnail, icon};
      streams.push(stream);
    }));
  
    return streams;
  }
}