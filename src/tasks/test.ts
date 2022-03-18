import { MessageEmbed, WebhookClient } from 'discord.js';
import got from 'got';
import moment, { Moment } from 'moment';
import { load } from 'cheerio';

(async () => {
  const today = moment().startOf('day');
  const embeds: MessageEmbed[] = [];
  const runs = await getStreamsOf(today);
  Object.entries(runs).forEach(entry => {
    const [vtuber, runs] = entry;
    runs.forEach((run: Stream, index: number) => {
      const embed = new MessageEmbed()
        .setColor(run.isLive ? '#f00a2c' : '#bab8b9')
        .setTitle(run.title)
        .setURL(run.link.href)
        .setAuthor({ name: vtuber, iconURL: run.icon.href})
        .addField('run starts at', moment(run.date).format('HH:mm'), true)
        .setImage(run.thumbnail.href)
        .setTimestamp()
      embeds.push(embed);
    })
  })
  
  const webhookClient = new WebhookClient({ id: process.env.WEBHOOK_ID!, token: process.env.WEBHOOK_TOKEN!});
  webhookClient.send({
    content: 'Todays schedule',
    username: 'Hololiver',
    avatarURL: 'https://i.imgur.com/AfFp7pu.png',
    embeds: embeds,
  });
})();

async function getStreamsOf(day: Moment) {
  const headers = {Cookie: "timezone=UTC"};
  const response = await got.get("https://schedule.hololive.tv/lives/english", {headers}).text();
  
  const $ = load(response);
  const streamLinks = $('a[href*="youtube.com"]').toArray();
  const streams: {[key: string]: Stream[]} = {}
 
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

    if (!date.clone().startOf('day').isSame(day)) {
      return Promise.resolve();
    }

    const link = new URL($element.attr("href") || "");
    const style = $element.attr("style") || "";
    const isLive = /border:.*red/.test(style);
    const name = $element.find("div.name").text().trim();
    const thumbnail =  new URL($element.find('img[src*="img.youtube.com"]').attr("src") || "");
    const icon = new URL($element.find('img[src*="yt3.ggpht.com"]').attr("src") || "");

    const streamPage = await got.get(link!).text();
    const $yt = load(streamPage);
    const title = $yt("title").text().replace(" - YouTube", "").trim();
    
    const data: Stream = {date, isLive, title, link, thumbnail, icon};
    
    if (!streams[name]) {
      streams[name] = [];
    }

    streams[name].push(data);

  }));

  return streams;
}