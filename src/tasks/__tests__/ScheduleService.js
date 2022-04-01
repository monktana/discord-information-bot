import fs from "fs";
import { ScheduleService } from "../ScheduleService.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_PATH = `${__dirname}/fixture`;

const scheduleService = new ScheduleService();
const rawstreamsFixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/rawStreams.json`));
const stremsWithDatesFixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/stremsWithDates.json`));
const streamDaysFixture = JSON.parse(fs.readFileSync(`${FIXTURE_PATH}/streamDays.json`));

describe("parse schedule HTML to basic JSON", () => {
  it("generates the expected stream information", () => {
    const html = fs.readFileSync(`${FIXTURE_PATH}/withoutCarousel.html`);
    const rawStreams = scheduleService.parseHTMLToJson(html);

    expect(rawStreams).toStrictEqual(rawstreamsFixture);
    expect(scheduleService.processContext.days).toStrictEqual(streamDaysFixture);
  });

  it("generates the expected stream information with carousel", () => {
    const html = fs.readFileSync(`${FIXTURE_PATH}/withCarousel.html`);
    const rawStreams = scheduleService.parseHTMLToJson(html);

    expect(rawStreams).toStrictEqual(rawstreamsFixture);
    expect(scheduleService.processContext.days).toStrictEqual(streamDaysFixture);
  });
});

describe("add day information to stream(s)", () => {
  const html = fs.readFileSync(`${FIXTURE_PATH}/withCarousel.html`);
  const rawStreams = scheduleService.parseHTMLToJson(html);

  it("generates the expected stream information", () => {
    const streamsWithDates = scheduleService.addStreamDate(rawStreams);
    expect(streamsWithDates).toStrictEqual(stremsWithDatesFixture);
  });
});
