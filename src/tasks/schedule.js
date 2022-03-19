import redis from "redis";
import { WebhookClient } from "discord.js";
import ScheduleUpdateService from "./ScheduleUpdateService.js";

const client = redis.createClient();
const webhookClient = new WebhookClient({ id: process.env.WEBHOOK_ID, token: process.env.WEBHOOK_TOKEN});

const scheduleService = new ScheduleUpdateService({
  client,
  webhookClient
})

await scheduleService.update();

client.quit();