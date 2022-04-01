import { load } from 'cheerio';
import moment from 'moment';
import got from 'got';

export class ScheduleService {

  processContext = {}

  parseHTMLToJson(html) {
    const $ = load(html);

    const streamLinks = $('a[href*="youtube.com/watch"]').toArray();
    if (streamLinks.length === 0) {
      throw new Error('no streams found. selector might have changed.');
    }

    const streamDays = $('div.holodule.navbar-text').toArray();
    if (streamDays.length !== 3) {
      throw new Error('unexpected amount of date elements. selector might have changed.');
    }

    const days = streamDays.map((element) => {
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

    this.processContext.days = days;

    const streams = streamLinks.map((element) => {
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

    return streams;
  }

  addStreamDate(streams) {
    return streams.map(stream => {
      if (stream.link === this.processContext.days[0].firstStream) {
        this.processContext.currentDay = this.processContext.days.shift()
      }
      
      const [hours, minutes] = stream.time.split(':').map(value => Number(value));
      stream.date = moment(this.processContext.currentDay.day);
      stream.date.add(hours, 'h');
      stream.date.add(minutes, 'm');
      stream.date = stream.date.toISOString();

      delete stream.time;

      return stream
    });
  }

  async addTitle(streams) {
    return await Promise.all(streams.map(async (stream) => {
      const youtubeContent = await got.get(stream.link)
      const $ = load(youtubeContent.body);
      const title = $("title").text().replace(" - YouTube", "").trim();

      stream.title = title;

      return stream
    }))
  }

  parseScheduleToJson(html) {
    const $ = load(html);

    const streamLinks = $('a[href*="youtube.com/watch"]').toArray();
    if (streamLinks.length === 0) {
      throw new Error('no streams found. selector might have changed.');
    }

    const streamDays = $('div.holodule.navbar-text').toArray();
    if (streamDays.length !== 3) {
      throw new Error('unexpected amount of date elements. selector might have changed.');
    }

    const streams = streamLinks.map((element) => {
      const $element = $(element);

      let $currentContainer = $element.closest('div.container');
      let $dateContainer = null;

      while ($currentContainer.length > 0) {
        $dateContainer = $currentContainer.find('div.holodule.navbar-text')
        if ($dateContainer.length > 0) {
          break;
        }

        $currentContainer = $currentContainer.prev();
      }

      if (!$dateContainer || $currentContainer.length === 0) {
        // unexpected element
        return;
      }

      const streamDay = $currentContainer.find('div.holodule.navbar-text').text().trim().substring(0, 5);
      const streamTime = $element.find('div.datetime').text().trim();
      const [months, days] = streamDay.split('/');
      const [hours, minutes] = streamTime.split(':');
      const date = moment.utc({months, days, hours, minutes}).toISOString();

      const link = $element.attr('href');
      const style = $element.attr('style');
      const isLive = /border:.*red/.test(style);
      const name = $element.find('div.name').text().trim();
      const thumbnail = $element.find('img[src*="img.youtube.com"]').attr('src');
      const icon = $element.find('img[src*="yt3.ggpht.com"]').attr('src');
      const title = '';

      return {
        name, date, isLive, title, link, thumbnail, icon,
      };
    });

    return streams;
  }

  async get(logger) {
    const content = await got.get('https://schedule.hololive.tv/lives/english', { headers: { Cookie: 'timezone=UTC' } }).text();
    const $ = load(content);

    // const streamLinks = $('a[href*="youtube.com/watch"]').toArray();
    const streamLinks = $('a[href*="youtube.com/watch"]').toArray();
    if (streamLinks.length === 0) {
      throw new Error('no streams found. selector might have changed.');
    }

    const streamDays = $('div.holodule.navbar-text').toArray();
    if (streamDays.length !== 3) {
      throw new Error('unexpected amount of date elements. selector might have changed.');
    }
    let streams = []
    try {
      streams = streamLinks.map((element) => {
        const $element = $(element);

        let $currentContainer = $element.closest('div.container');
        let $dateContainer = null;

        while ($currentContainer.length > 0) {
          $dateContainer = $currentContainer.find('div.holodule.navbar-text')
          if ($dateContainer.length > 0) {
            break;
          }

          $currentContainer = $currentContainer.prev();
        }

        if (!$dateContainer || $currentContainer.length === 0) {
          // unexpected element
          return;
        }

        const streamDay = $currentContainer.find('div.holodule.navbar-text').text().trim().substring(0, 5);
        const streamTime = $element.find('div.datetime').text().trim();
        const [months, days] = streamDay.split('/');
        const [hours, minutes] = streamTime.split(':');
        const date = moment.utc({months, days, hours, minutes}).toISOString();

        const link = $element.attr('href');
        const style = $element.attr('style');
        const isLive = /border:.*red/.test(style);
        const name = $element.find('div.name').text().trim();
        const thumbnail = $element.find('img[src*="img.youtube.com"]').attr('src');
        const icon = $element.find('img[src*="yt3.ggpht.com"]').attr('src');
        
        const title = '';

        return {
          name, date, isLive, title, link, thumbnail, icon
        };
      });
      console.log(streams);
    } catch (error) {
      logger.error('Failed to parse hololive schedule', { error });
    }

    return streams;
  }
}
