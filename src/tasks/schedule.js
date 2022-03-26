import redis from "redis";
import { WebhookClient } from "discord.js";
import {ScheduleUpdateService, DiscordNotificationService} from "./ScheduleUpdateService.js";

const client = redis.createClient()
const webhook = new WebhookClient({ id: process.env.WEBHOOK_ID, token: process.env.WEBHOOK_TOKEN})

const scheduleService = new ScheduleUpdateService({ redis: client })
const discordNotificationService = new DiscordNotificationService({ webhook })

const updates = await scheduleService.update()
discordNotificationService.sendNotifications(updates)

client.quit();