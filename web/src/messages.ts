import type { Message } from './types';

// Ids are bigint values sent as strings, so they are compared as BigInt:
// as plain strings "10" would sort before "9".
const byId = (a: Message, b: Message) => {
  const difference = BigInt(a.id) - BigInt(b.id);
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
};

// Combines two lists of messages without duplicates, oldest first.
export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const merged = new Map<string, Message>();
  for (const message of [...current, ...incoming]) {
    merged.set(message.id, message);
  }
  return [...merged.values()].sort(byId);
}
