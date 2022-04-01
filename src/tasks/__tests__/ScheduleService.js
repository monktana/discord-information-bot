import fs from "fs";
import { ScheduleService } from "../ScheduleService.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_PATH = `${__dirname}/fixture`;

const scheduleService = new ScheduleService();

describe("parse schedule HTML to basic JSON", () => {
  const fixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/rawStreams.json`));
  const streamDays = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/streamDays.json`));

  it("generates the expected stream information", () => {
    const html = fs.readFileSync(`${FIXTURE_PATH}/withoutCarousel.html`);
    const streams = scheduleService.parseHTMLToJson(html);

    expect(streams).toStrictEqual(fixture);
    expect(scheduleService.processContext.days).toStrictEqual(streamDays);
  });

  it("generates the expected stream information with carousel", () => {
    const html = fs.readFileSync(`${FIXTURE_PATH}/withCarousel.html`);
    const streams = scheduleService.parseHTMLToJson(html);

    expect(streams).toStrictEqual(fixture);
    expect(scheduleService.processContext.days).toStrictEqual(streamDays);
  });
});

describe("add day information to stream(s)", () => {
  const baseStreams = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/rawStreams.json`));
  const fixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/streamsWithDates.json`));

  it("generates the expected stream information", () => {
    const streamsWithDates = scheduleService.addStreamDate(baseStreams);
    expect(streamsWithDates).toStrictEqual(fixture);
  });
});

describe("add title information to stream(s)", () => {
  const baseStreams = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/rawStreams.json`));
  const fixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/streamsWithTitles.json`));

  it("generates the expected stream information", async () => {
    const streamsWithTitles = await scheduleService.addTitle(baseStreams);
    expect(streamsWithTitles).toStrictEqual(fixture);
  });
});

describe("complete parsing chain", () => {
  const html = fs.readFileSync(`${FIXTURE_PATH}/withoutCarousel.html`);
  const fixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/expectedStreams.json`));

  let service;
  let baseStreams;

  beforeEach(() => {
    service = new ScheduleService();
    baseStreams = scheduleService.parseHTMLToJson(html);
  })

  it("generates the expected stream information by adding date first", async () => {
    let streams = scheduleService.addStreamDate(baseStreams);
    streams = await scheduleService.addTitle(streams);

    expect(streams).toStrictEqual(fixture);
  });

  it("generates the expected stream information by adding title first", async () => {
    let streams = await scheduleService.addTitle(baseStreams);
    streams = scheduleService.addStreamDate(streams);

    expect(streams).toStrictEqual(fixture);
  });
});
