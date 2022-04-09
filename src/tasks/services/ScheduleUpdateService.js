import moment from 'moment';
import * as Sentry from '@sentry/node';
import { got } from "got";
import { NOTIFICATIONS } from "../notifications.js";
import { ParseHTMLToJson } from '../steps/parseHTMLToJSON.js';
import { AddTitle } from '../steps/addTitle.js';
import { AddStreamDate } from '../steps/addDate.js';

export class ScheduleUpdateService {
  constructor(dependencies) {
    this.dependencies = dependencies;
  }

  /**
   * 
   * @returns 
   */
  async update() {
    const scope = Sentry.getCurrentHub().pushScope();
    scope.setTag('service', this.constructor.name);
    const streams = await this.get();
    Sentry.getCurrentHub().popScope();

    this.dependencies.redis.connect();

    const changedStreams = [];
    for (const stream of streams) {
      const scope = Sentry.getCurrentHub().pushScope();
      scope.setTag('service', this.constructor.name);
      scope.setContext('stream', stream);
      const changes = await this.updateStream(stream);
      Sentry.getCurrentHub().popScope();

      changedStreams.push(changes);
    }

    changedStreams.filter(Boolean);

    return changedStreams;
  }

  /**
   * 
   * @param {*} stream 
   * @returns 
   */
  async updateStream(stream) {
    const cachedStream = await this.dependencies.redis.json.get(stream.link, '.');

    if (!cachedStream) {
      this.dependencies.redis.json.set(stream.link, '.', stream);
      this.dependencies.logger.info('new stream', { stream });

      return;
    }

    cachedStream.date = moment(cachedStream.date);
    stream.date = moment(stream.date);
    let changes = this.streamHasChanges(cachedStream, stream);
    if (changes.length === 0) {
      this.dependencies.logger.info('no changed detected', { old: cachedStream, new: stream });
      return;
    }

    this.dependencies.logger.info('properties of a stream changed', { old: cachedStream, new: stream, changes });

    changes = changes.sort((first, second) => NOTIFICATIONS[first].priority - NOTIFICATIONS[second].priority);
    const { type } = NOTIFICATIONS[changes[0]];
    
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
    const scheduleHTML = await got.get('https://schedule.hololive.tv/lives/english', { headers: { cookie: 'timezone=UTC' }}).text();

    const parseHTMLToJSON = new ParseHTMLToJson();
    const áddDate = new AddStreamDate();
    áddDate.useContext(parseHTMLToJSON);
    const addTitle = new AddTitle();

    const steps = [];
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
