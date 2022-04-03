import got from 'got';
import { load } from 'cheerio';

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