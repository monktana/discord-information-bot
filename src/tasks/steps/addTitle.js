import got from 'got';
import { load } from 'cheerio';
import { ProcessStep } from './processStep.js';

export class AddTitle extends ProcessStep {

  async run(stream) {
    const youtubeContent = await got.get(stream.link)
    const $ = load(youtubeContent.body);
    const title = $("title").text().replace(" - YouTube", "").trim();

    stream.title = title;

    return stream
  }

  extendScope(scope, input) {
    scope.setContext('stream', input);
  }

  useContext(context) {
    this.context = context;
  }
}