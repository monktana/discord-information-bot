import fs from "fs";
import nock from "nock";
import { ParseHTMLToJson } from "../steps/parseHTMLToJSON.js";
import { AddStreamDate } from "../steps/addDate.js";
import { AddTitle } from "../steps/addTitle.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_PATH = `${__dirname}/fixture`;

nock('https://www.youtube.com')
.persist()
.get(/.*/)
.reply(200, (uri, requestBody) => {
  const key = uri.split("=")[1];
  return fs.readFileSync(`${FIXTURE_PATH}/responses/${key}.html`);
});

describe("parse schedule HTML to basic JSON", () => {
  const fixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/json/rawStreams.json`));
  const streamDays = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/json/streamDays.json`));

  it("generates the expected stream information", async () => {
    const html = fs.readFileSync(`${FIXTURE_PATH}/html/withoutCarousel.html`);
    
    const steps = [];
    steps.push(new ParseHTMLToJson());

    let currentObjectQueue = [html];
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }

    expect(currentObjectQueue).toStrictEqual(fixture);
    expect(steps[0].days).toStrictEqual(streamDays);
  });

  it("generates the expected stream information with carousel", async () => {
    const html = fs.readFileSync(`${FIXTURE_PATH}/html/withCarousel.html`);
    
    const steps = [];
    steps.push(new ParseHTMLToJson());

    let currentObjectQueue = [html];
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }

    expect(currentObjectQueue).toStrictEqual(fixture);
    expect(steps[0].days).toStrictEqual(streamDays);
  });
});

describe("add day information to stream(s)", () => {
  const html = fs.readFileSync(`${FIXTURE_PATH}/html/withoutCarousel.html`);
  const fixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/json/streamsWithDates.json`));

  it("generates the expected stream information", async () => {
    const steps = [];
    const parseHTMLToJson = new ParseHTMLToJson();
  
    const addStreamDate = new AddStreamDate();
    addStreamDate.useContext(parseHTMLToJson);

    steps.push(parseHTMLToJson);
    steps.push(addStreamDate)
  
    let currentObjectQueue = [html];
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }
  
    expect(currentObjectQueue).toStrictEqual(fixture);
  });
});

describe("add title information to stream(s)", () => {
  const html = fs.readFileSync(`${FIXTURE_PATH}/html/withoutCarousel.html`);
  const fixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/json/streamsWithTitles.json`));

  it("generates the expected stream information", async () => {
    const steps = [];

    const parseHTMLToJson = new ParseHTMLToJson();
    const addTitle = new AddTitle();

    steps.push(parseHTMLToJson);
    steps.push(addTitle)
  
    let currentObjectQueue = [html];
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }
  
    expect(currentObjectQueue).toStrictEqual(fixture);
  });
});

describe("complete parsing chain", () => {
  const html = fs.readFileSync(`${FIXTURE_PATH}/html/withoutCarousel.html`);
  const fixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/json/expectedStreams.json`));

  it("generates the expected stream information by adding date first", async () => {
    const steps = [];

    const parseHTMLToJson = new ParseHTMLToJson();
    const addStreamDate = new AddStreamDate();
    addStreamDate.useContext(parseHTMLToJson);
    const addTitle = new AddTitle();

    steps.push(parseHTMLToJson);
    steps.push(addStreamDate);
    steps.push(addTitle)
  
    let currentObjectQueue = [html];
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }
  
    expect(currentObjectQueue).toStrictEqual(fixture);
  });

  it("generates the expected stream information by adding title first", async () => {
    const steps = [];

    const parseHTMLToJson = new ParseHTMLToJson();
    const addStreamDate = new AddStreamDate();
    addStreamDate.useContext(parseHTMLToJson);
    const addTitle = new AddTitle();

    steps.push(parseHTMLToJson);
    steps.push(addTitle)
    steps.push(addStreamDate);
  
    let currentObjectQueue = [html];
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      currentObjectQueue = await Promise.all(currentObjectQueue.map(step.process.bind(step)));
      currentObjectQueue = currentObjectQueue.flat();
    }
  
    expect(currentObjectQueue).toStrictEqual(fixture);
  });
});
