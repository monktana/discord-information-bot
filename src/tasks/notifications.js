const NOTIFICATION_TYPES = Object.freeze({
  EMBED: 1,
  TEXT: 2,
});

const NOTIFICATION_PRIORITY = Object.freeze({
  HIGH: 1,
  MEDIUM: 50,
  LOW: 100,
});

const NOTIFICATIONS = {
  date: {
    type: NOTIFICATION_TYPES.TEXT,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    message: 'The stream now starts at: #1',
    compare: (current, cached) => !current.date.isSame(cached.date),
  },
  isLive: {
    type: NOTIFICATION_TYPES.EMBED,
    priority: NOTIFICATION_PRIORITY.HIGH,
    message: 'The stream just went #1',
    compare: (current, cached) => current.isLive !== cached.isLive,
  },
  title: {
    type: NOTIFICATION_TYPES.TEXT,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    message: 'The stream is now titled as: #1',
    compare: (current, cached) => current.title !== cached.title,
  },
};

export { NOTIFICATIONS, NOTIFICATION_PRIORITY, NOTIFICATION_TYPES };
