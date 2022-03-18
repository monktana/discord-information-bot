import { Client, Collection } from 'discord.js';
import { Moment } from 'moment';

declare module "discord.js" {
  export interface Client {
    commands: Collection
  }
}

declare global {
  interface Stream {
    date: Moment,
    isLive: boolean,
    title: string,
    link: URL
    thumbnail: URL
    icon: URL
  }
}