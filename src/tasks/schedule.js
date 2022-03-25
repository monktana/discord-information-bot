import redis from "redis";
import {ScheduleUpdateService, DiscordNotificationService} from "./ScheduleUpdateService.js";

const client = redis.createClient()

const scheduleService = new ScheduleUpdateService({redis: client})
const discordNotificationService = new DiscordNotificationService({ id: process.env.WEBHOOK_ID, token: process.env.WEBHOOK_TOKEN})

const updates = await scheduleService.update()
discordNotificationService.sendNotifications(updates)

client.quit();