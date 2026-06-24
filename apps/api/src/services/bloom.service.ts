import { createClient } from 'redis';
import { BloomFilter } from 'scalable-bloom-kit';
import { env } from '../env';
import { UserModel } from '../models/user.model';

const client = createClient({
  url: `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`,
});

export const usernameBloom = new BloomFilter({
  client,
  key: 'users:username:bloom',
  expectedItems: 1000000,
  errorRate: 0.01,
  expansion: 2,
});
export async function initUsernameBloom(): Promise<void> {
  if (!client.isOpen) {
    await client.connect();
    console.info('[bloom] Connected to Redis for Bloom Filter');
  }
  await usernameBloom.init();
  console.info('[bloom] Username Bloom Filter initialized successfully');
}

export async function backfillUsernameBloom(): Promise<void> {
  try {
    const users = await UserModel.find(
      { username: { $exists: true, $ne: null } },
      'username'
    );

    let count = 0;
    for (const user of users) {
      if (user.username) {
        await usernameBloom.add(user.username);
        count++;
      }
    }
    if (count > 0) {
      console.info(`[bloom] Backfilled ${count} username(s) into Bloom Filter successfully`);
    } else {
      console.info('[bloom] No existing usernames found for backfill');
    }
  } catch (err: any) {
    console.error('[bloom] Failed to backfill usernames:', err);
  }
}
