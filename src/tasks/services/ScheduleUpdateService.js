import moment from 'moment';
import * as Sentry from '@sentry/node';
import got from 'got';
import { NOTIFICATIONS } from '../notifications.js';
import ParseHTMLToJson from '../steps/parseHTMLToJSON.js';
import AddTitle from '../steps/addTitle.js';
import AddStreamDate from '../steps/addDate.js';

export default class ScheduleUpdateService {
  constructor(dependencies) {
    this.dependencies = dependencies;
  }

  /**
   *
   * @returns
   */
  async update() {
    const updateScope = Sentry.getCurrentHub().pushScope();
    updateScope.setTag('service', this.constructor.name);
    const streams = await this.get();
    Sentry.getCurrentHub().popScope();

    this.dependencies.redis.connect();

    const changes = [];
    for (let index = 0; index < streams.length; index += 1) {
      const stream = streams[index];

      const streamScope = Sentry.getCurrentHub().pushScope();
      streamScope.setTag('service', this.constructor.name);
      streamScope.setContext('stream', stream);

      changes.push(this.updateStream(stream));

      Sentry.getCurrentHub().popScope();
    }

    const updates = await Promise.all(changes);

    return updates.filter(Boolean);
  }

  /**
   *
   * @param {*} stream
   * @returns
   */
  async updateStream(stream) {
    const newStream = stream;
    const cachedStream = await this.dependencies.redis.json.get(newStream.link, '.');

    if (!cachedStream) {
      this.dependencies.redis.json.set(newStream.link, '.', newStream);
      this.dependencies.logger.info('new stream', { stream });

      return null;
    }

    cachedStream.date = moment(cachedStream.date);
    newStream.date = moment(newStream.date);
    let changes = this.streamHasChanges(cachedStream, newStream);
    if (changes.length === 0) {
      this.dependencies.logger.info('no changed detected', { old: cachedStream, new: stream });
      return null;
    }

    changes = changes.sort((first, second) => NOTIFICATIONS[first].priority - NOTIFICATIONS[second].priority);
    const { type } = NOTIFICATIONS[changes[0]];

    this.dependencies.logger.info('properties of a stream changed', { old: cachedStream, new: stream, changes });
    this.dependencies.redis.json.set(stream.link, '.', stream);

    return { stream, changes, type };
  }

  /**
   *
   * @param {*} cached
   * @param {*} stream
   * @returns
   */
  streamHasChanges(cached, stream) {
    return Object.keys(NOTIFICATIONS).filter((key) => NOTIFICATIONS[key].compare(stream, cached));
  }

  /**
   *
   * @returns
   */
  async get() {
    const scheduleHTML = await got.get('https://schedule.hololive.tv/lives/english', { headers: { cookie: 'timezone=UTC' } }).text();

    const parseHTMLToJSON = new ParseHTMLToJson();
    const áddDate = new AddStreamDate();
    áddDate.useContext(parseHTMLToJSON);
    const addTitle = new AddTitle();

    const steps = [];
    steps.push(parseHTMLToJSON);
    steps.push(áddDate);
    steps.push(addTitle);

    let currentObjectQueue = [scheduleHTML];
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];

      // eslint-disable-next-line no-await-in-loop -- currentObjectQueue is input for next iteration
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }

    return currentObjectQueue;
  }
}
