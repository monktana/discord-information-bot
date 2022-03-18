export const name = 'ready';
export const once = true;
export function execute(client: any) {
  console.log(`Ready! Logged in as ${client.user.tag}`);
}