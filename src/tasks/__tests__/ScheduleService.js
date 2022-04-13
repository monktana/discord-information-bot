import fs from 'fs';
import nock from 'nock';
import { jest } from '@jest/globals'; // eslint-disable-line import/no-extraneous-dependencies
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ParseHTMLToJson, AddTitle, AddStreamDate } from '../steps/steps.js';

const filename = fileURLToPath(import.meta.url);
const workdir = dirname(filename);
const FIXTURE_PATH = `${workdir}/fixture`;

jest.mock('@sentry/node');

nock('https://www.youtube.com')
  .persist()
  .get(/.*/)
  .reply(200, (uri) => {
    const key = uri.split('=')[1];
    return fs.readFileSync(`${FIXTURE_PATH}/responses/${key}.html`);
  });

describe('parse schedule HTML to basic JSON', () => {
  const fixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/json/rawStreams.json`));
  const streamDays = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/json/streamDays.json`));

  it('generates the expected stream information', async () => {
    const html = fs.readFileSync(`${FIXTURE_PATH}/html/withoutCarousel.html`);

    const steps = [];
    steps.push(new ParseHTMLToJson());

    let currentObjectQueue = [html];
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];

      // eslint-disable-next-line no-await-in-loop -- currentObjectQueue is input for next iteration
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }

    expect(currentObjectQueue).toStrictEqual(fixture);
    expect(steps[0].days).toStrictEqual(streamDays);
  });

  it('generates the expected stream information with carousel', async () => {
    const html = fs.readFileSync(`${FIXTURE_PATH}/html/withCarousel.html`);

    const steps = [];
    steps.push(new ParseHTMLToJson());

    let currentObjectQueue = [html];
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];

      // eslint-disable-next-line no-await-in-loop -- currentObjectQueue is input for next iteration
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }

    expect(currentObjectQueue).toStrictEqual(fixture);
    expect(steps[0].days).toStrictEqual(streamDays);
  });
});

describe('add day information to stream(s)', () => {
  const html = fs.readFileSync(`${FIXTURE_PATH}/html/withoutCarousel.html`);
  const fixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/json/streamsWithDates.json`));

  it('generates the expected stream information', async () => {
    const steps = [];
    const parseHTMLToJson = new ParseHTMLToJson();

    const addStreamDate = new AddStreamDate();
    addStreamDate.useContext(parseHTMLToJson);

    steps.push(parseHTMLToJson);
    steps.push(addStreamDate);

    let currentObjectQueue = [html];
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];

      // eslint-disable-next-line no-await-in-loop -- currentObjectQueue is input for next iteration
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }

    expect(currentObjectQueue).toStrictEqual(fixture);
  });
});

describe('add title information to stream(s)', () => {
  const html = fs.readFileSync(`${FIXTURE_PATH}/html/withoutCarousel.html`);
  const fixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/json/streamsWithTitles.json`));

  it('generates the expected stream information', async () => {
    const steps = [];

    const parseHTMLToJson = new ParseHTMLToJson();
    const addTitle = new AddTitle();

    steps.push(parseHTMLToJson);
    steps.push(addTitle);

    let currentObjectQueue = [html];
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];

      // eslint-disable-next-line no-await-in-loop -- currentObjectQueue is input for next iteration
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }

    expect(currentObjectQueue).toStrictEqual(fixture);
  });
});

describe('complete parsing chain', () => {
  const html = fs.readFileSync(`${FIXTURE_PATH}/html/withoutCarousel.html`);
  const fixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/json/expectedStreams.json`));

  it('generates the expected stream information by adding date first', async () => {
    const steps = [];

    const parseHTMLToJson = new ParseHTMLToJson();
    const addStreamDate = new AddStreamDate();
    addStreamDate.useContext(parseHTMLToJson);
    const addTitle = new AddTitle();

    steps.push(parseHTMLToJson);
    steps.push(addStreamDate);
    steps.push(addTitle);

    let currentObjectQueue = [html];
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];

      // eslint-disable-next-line no-await-in-loop -- currentObjectQueue is input for next iteration
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }

    expect(currentObjectQueue).toStrictEqual(fixture);
  });

  it('generates the expected stream information by adding title first', async () => {
    const steps = [];

    const parseHTMLToJson = new ParseHTMLToJson();
    const addStreamDate = new AddStreamDate();
    addStreamDate.useContext(parseHTMLToJson);
    const addTitle = new AddTitle();

    steps.push(parseHTMLToJson);
    steps.push(addTitle);
    steps.push(addStreamDate);

    let currentObjectQueue = [html];
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];

      // eslint-disable-next-line no-await-in-loop -- currentObjectQueue is input for next iteration
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }

    expect(currentObjectQueue).toStrictEqual(fixture);
  });
});
