import { MessageEmbed } from "discord.js";
import { WebhookClient } from "discord.js";
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
  name: {
    type: NOTIFICATION_TYPES.TEXT,
    priority: NOTIFICATION_PRIORITY.LOW,
    compare: (current, cached) => current.name !== cached.name,
  },
  date: {
    type: NOTIFICATION_TYPES.TEXT,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    compare: (current, cached) => !current.date.isSame(cached.date),
  },
  isLive: {
    type: NOTIFICATION_TYPES.EMBED,
    priority: NOTIFICATION_PRIORITY.HIGH,
    compare: (current, cached) => current.isLive !== cached.isLive,
  },
  title: {
    type: NOTIFICATION_TYPES.TEXT,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
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
        this.dependencies.redis.json.set(stream.link, '.', stream);
        return
      }

      cachedStream.date = moment(cachedStream.date)
      let changes = this.streamHasChanges(cachedStream, stream)
      if (changes.length === 0) {
        return
      }

      changes = changes.sort((first, second) => NOTIFICATIONS[first].priority  - NOTIFICATIONS[second].priority)
      const type = NOTIFICATIONS[changes[0]].type

      changedStreams.push({stream, changes, type})

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
  constructor(options) {
    this.webhook = new WebhookClient({ id: options.id, token: options.token});
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
    this.webhook.send({
      content: `UPDATE: ${notification.stream.title} (${notification.stream.name}) will go live at ${notification.stream.date.format('DD MM YYYY hh:mm:ss')}`,
      username: 'Hololiver',
      avatarURL: 'https://i.imgur.com/AfFp7pu.png'
    });
  }
  
  sendEmbedNotification(notification) {
    const embed = new MessageEmbed()
        .setColor(notification.stream.isLive ? '#f00a2c' : '#bab8b9')
        .setTitle(notification.stream.title)
        .setURL(notification.stream.link)
        .setAuthor({ name: vtuber, iconURL: notification.stream.icon})
        .addField('Status', notification.stream.isLive ? 'Live' : 'Finished')
        .setImage(notification.stream.thumbnail)
        .setTimestamp()

    this.webhook.send({
      content: 'The status of a stream changed',
      username: 'Hololiver',
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