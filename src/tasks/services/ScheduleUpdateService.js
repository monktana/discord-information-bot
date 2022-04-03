
import moment from 'moment';
import { got } from "got";
import { NOTIFICATIONS } from "../notifications.js";
import { ParseHTMLToJson } from '../steps/parseHTMLToJSON.js';
import { AddTitle } from '../steps/addTitle.js';
import { AddStreamDate } from '../steps/addDate.js';


export class ScheduleUpdateService {
  constructor(dependencies) {
    this.dependencies = dependencies;
  }

  async update() {
    const streams = await this.get(this.dependencies.logger);
    const changedStreams = [];

    this.dependencies.redis.connect();

    const promises = streams.map(async (stream) => {
      const cachedStream = await this.dependencies.redis.json.get(stream.link, '.');

      if (!cachedStream) {
        this.dependencies.logger.info('New stream', { stream });
        this.dependencies.redis.json.set(stream.link, '.', stream);

        return;
      }

      cachedStream.date = moment(cachedStream.date);
      stream.date = moment(stream.date);
      let changes = this.streamHasChanges(cachedStream, stream);
      if (changes.length === 0) {
        this.dependencies.logger.info('No changed detected', { old: cachedStream, new: stream });
        return;
      }

      changes = changes.sort((first, second) => NOTIFICATIONS[first].priority - NOTIFICATIONS[second].priority);
      const { type } = NOTIFICATIONS[changes[0]];

      changedStreams.push({ stream, changes, type });
      this.dependencies.logger.info('Properties of a stream changed', { old: cachedStream, new: stream, changes });

      this.dependencies.redis.json.set(stream.link, '.', stream);
    });

    await Promise.all(promises);

    return changedStreams;
  }

  streamHasChanges(cached, stream) {
    return Object.keys(NOTIFICATIONS).filter((key) => NOTIFICATIONS[key].compare(stream, cached));
  }

  async get() {
    const scheduleHTML = await got.get('https://schedule.hololive.tv/lives/english', { headers: { cookie: 'timezone=UTC' }}).text();

    const steps = [];

    const parseHTMLToJSON = new ParseHTMLToJson();
    const áddDate = new AddStreamDate();
    áddDate.useContext(parseHTMLToJSON);
    const addTitle = new AddTitle();

    steps.push(parseHTMLToJSON);
    steps.push(áddDate);
    steps.push(addTitle);
  
    let currentObjectQueue = [scheduleHTML];
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }

    return currentObjectQueue;
  }
}