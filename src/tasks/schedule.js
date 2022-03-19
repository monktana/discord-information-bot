import got from 'got';
import moment from 'moment';
import { load } from 'cheerio';
import { WebhookClient } from "discord.js";
import redis from "redis";

const notifications = {
  name: {
    priority: 50,
    compare: (current, cached) => current.name !== cached.name,
    handle: undefined,
  },
  date: {
    priority: 10,
    compare: (current, cached) => current.date.isSame(cached.date),
    handle: sendTextNotifications,
  },
  isLive: {
    priority: 1,
    compare: (current, cached) => current.isLive !== cached.isLive,
    handle: sendEmbedNotifications,
  },
  title: {
    priority: 40,
    compare: (current, cached) => current.title !== cached.title,
    handle: undefined,
  },
  link: {
    priority: 50,
    compare: (current, cached) => current.link.href !== cached.link.href,
    handle: undefined,
  },
  thumbnail: {
    priority: 50,
    compare: (current, cached) => current.thumbnail.href !== cached.thumbnail.href,
    handle: undefined,
  },
  icon: {
    priority: 50,
    compare: (current, cached) => current.icon.href !== cached.icon.href,
    handle: undefined,
  }
}

const changedStreams = []

await updateSchedule();
sendNotifications(changedStreams);

async function updateSchedule() {
  const client = redis.createClient();
  client.connect();

  const streams = await getStreams();

  const promises = streams.map(async (stream) => {
    const cachedStream = await client.json.get(stream.link, '.');

    if (!cachedStream) {
      client.json.set(stream.link, '.', stream);
      return
    }

    cachedStream.date = moment(cachedStream.date)

    const changes = streamHasChanges(cachedStream, stream)
    if (!changes) {
      return
    }

    changes = changes.sort((first, second) => notifications[first].priority  - notifications[second].priority)
    changedStreams.push({stream, changes})

    //todo: send message about changed stream
    client.json.set(stream.link, '.', stream);
  })

  await Promise.all(promises);

  client.quit();
}

function sendTextNotifications(stream) {
    const webhookClient = new WebhookClient({ id: process.env.WEBHOOK_ID, token: process.env.WEBHOOK_TOKEN});
    webhookClient.send({
      content: `UPDATE: ${stream.title} (${stream.name}) will go live at ${stream.date.format('DD MM YYYY hh:mm:ss')}`,
      username: 'Hololiver',
      avatarURL: 'https://i.imgur.com/AfFp7pu.png'
    });
}

function sendEmbedNotifications(stream) {
  const embed = new MessageEmbed()
      .setColor(stream.isLive ? '#f00a2c' : '#bab8b9')
      .setTitle(stream.title)
      .setURL(stream.link)
      .setAuthor({ name: vtuber, iconURL: stream.icon})
      .addField('Status', stream.isLive ? 'Live' : 'Finished')
      .setImage(stream.thumbnail)
      .setTimestamp()

  const webhookClient = new WebhookClient({ id: process.env.WEBHOOK_ID, token: process.env.WEBHOOK_TOKEN});
  webhookClient.send({
    content: 'The status of a stream changed',
    username: 'Hololiver',
    avatarURL: 'https://i.imgur.com/AfFp7pu.png',
    embeds: [embed],
  });
}

function streamHasChanges(cached, stream) {
  return Object.keys(notifications).filter(key => {
    return notifications[key].compare(stream, cached)
  });
}

async function getStreams() {
  const response = await got.get("https://schedule.hololive.tv/lives/english", { headers: { Cookie: "timezone=UTC" }}).text();
  
  const $ = load(response);
  const streamLinks = $('a[href*="youtube.com"]').toArray();
  const streams = []

  await Promise.all(streamLinks.map(async (element) => {
    const $element = $(element);

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
    
    const data = {name, date, isLive, title, link, thumbnail, icon};
    streams.push(data);
  }));

  return streams;
}