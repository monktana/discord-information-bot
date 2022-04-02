import { load } from 'cheerio';
import moment from 'moment';
import got from 'got';


export class ParseHTMLToJson {

  async process(html) {
    const $ = load(html);

    const streamLinks = $('a[href*="youtube.com/watch"]').toArray();
    if (streamLinks.length === 0) {
      throw new Error('no streams found. selector might have changed.');
    }
  
    const streamDays = $('div.holodule.navbar-text').toArray();
    if (streamDays.length !== 3) {
      throw new Error('unexpected amount of date elements. selector might have changed.');
    }
  
    this.days = streamDays.map((element) => {
      const $element = $(element);
      const dayString = $element.text().trim().substring(0, 5);
      const [months, days] = dayString.split('/').map(value => Number(value));
      const day = moment.utc({months: (months-1), days}).toISOString();
  
      const firstStream = $element.closest('div.row').find('a[href*="youtube.com/watch"]').first().attr('href');
  
      return {
        day,
        firstStream
      }
    });
  
    this.streams = streamLinks.map((element) => {
      const $element = $(element);
  
      const link = $element.attr('href');
      const style = $element.attr('style');
      const isLive = /border:.*red/.test(style);
      const time = $element.find('div.datetime').text().trim();
      const name = $element.find('div.name').text().trim();
      const thumbnail = $element.find('img[src*="img.youtube.com"]').attr('src');
      const icon = $element.find('img[src*="yt3.ggpht.com"]').attr('src');
  
      return {
        name, isLive, link, thumbnail, icon, time
      };
    })
  
    return this.streams;
  }

  useContext(context) {
    this.context = context;
  }
}

export class AddStreamDate {

  async process(stream) {
    if (stream.link === this.context.days[0].firstStream) {
      this.currentDay = this.context.days.shift()
    }
    
    const [hours, minutes] = stream.time.split(':').map(value => Number(value));
    stream.date = moment(this.currentDay.day);
    stream.date.add(hours, 'h');
    stream.date.add(minutes, 'm');
    stream.date = stream.date.toISOString();

    delete stream.time;

    return stream
  }

  useContext(context) {
    this.context = context;
  }
}

export class AddTitle {

  async process(stream) {
    const youtubeContent = await got.get(stream.link)
    const $ = load(youtubeContent.body);
    const title = $("title").text().replace(" - YouTube", "").trim();

    stream.title = title;

    return stream
  }

  useContext(context) {
    this.context = context;
  }
}
