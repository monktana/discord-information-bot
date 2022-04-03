import redis from "redis";
import winston from "winston";
import { WebhookClient } from "discord.js";
import { ScheduleUpdateService } from "./services/ScheduleUpdateService.js";
import { DiscordNotificationService } from "./services/DiscordNotificationService.js";

const client = redis.createClient()
const webhook = new WebhookClient({ id: process.env.WEBHOOK_ID, token: process.env.WEBHOOK_TOKEN})
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'schedule-service' },
  transports: [
    new winston.transports.File({ filename: './docs/tasks/info.log' }),
  ],
  exitOnError: false
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.json()
    )
  }));
}

const scheduleService = new ScheduleUpdateService({ redis: client, logger })
const discordNotificationService = new DiscordNotificationService({ webhook, logger })

const updates = await scheduleService.update()
discordNotificationService.sendNotifications(updates)

client.quit();