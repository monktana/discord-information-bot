import got from 'got';
import moment from 'moment';
import { load } from 'cheerio';
import redis from "redis";

await updateSchedule();

async function updateSchedule() {
  const client = redis.createClient();
  client.connect();

  const streams = await getStreams();

  const promises = streams.map(async (stream) => {
    const cachedStream = await client.json.get(stream.link, '.');

    if (!cachedStream) {
      client.json.set(stream.link, '.', stream);
      console.log(`New Stream: ${stream.name}, ${stream.date.format("DD MM YYYY hh:mm:ss")}, ${stream.title}`)
      return
    }

    if (!streamHasChanges(cachedStream, stream)) {
      return
    }

    //todo: send message about changed stream
    client.json.set(stream.link, '.', stream);
  })

  await Promise.all(promises);

  client.quit();
  console.log("done");
}

function sendNotification() {
  // const embed = new MessageEmbed()
  //   .setColor(stream.isLive ? '#f00a2c' : '#bab8b9')
  //   .setTitle(stream.title)
  //   .setURL(stream.link)
  //   .setAuthor({ name: vtuber, iconURL: stream.icon})
  //   .addField('run starts at', moment(stream.date).format('HH:mm'), true)
  //   .setImage(stream.thumbnail)
  //   .setTimestamp()
  // embeds.push(embed);

  // const webhookClient = new WebhookClient({ id: process.env.WEBHOOK_ID, token: process.env.WEBHOOK_TOKEN});
  // webhookClient.send({
  //   content: 'Todays schedule',
  //   username: 'Hololiver',
  //   avatarURL: 'https://i.imgur.com/AfFp7pu.png',
  //   embeds: embeds,
  // });
}

function streamHasChanges(cached, stream) {
  return !stream.date.isSame(moment(cached.date)) ||
          stream.title !== cached.title ||
          stream.thumbnail !== cached.thumbnail ||
          stream.icon !== cached.icon
}

async function getStreams() {
  const headers = { Cookie: "timezone=UTC" };
  const response = await got.get("https://schedule.hololive.tv/lives/english", {headers}).text();
  
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
    
    const data = {name,date,isLive,title,link,thumbnail,icon};
    streams.push(data);

  }));

  return streams;
}