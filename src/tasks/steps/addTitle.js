import { got } from 'got';
import { load } from 'cheerio';
import ProcessStep from './processStep';

export default class AddTitle extends ProcessStep {
  async run(stream) {
    const streamWithTitle = stream;

    const youtubeContent = await got.get(stream.link);
    const $ = load(youtubeContent.body);
    const title = $('title').text().replace(' - YouTube', '').trim();

    streamWithTitle.title = title;

    return streamWithTitle;
  }

  extendScope(scope, input) {
    scope.setContext('stream', input);
  }

  useContext(context) {
    this.context = context;
  }
}
