import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { StoreEvent } from './entities/event.entity';
import { User } from './entities/user.entity';

const EVENT_TYPES = [
  'page_view',
  'add_to_cart',
  'remove_from_cart',
  'checkout_started',
  'purchase',
] as const;

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomAmount(): number {
  return Math.round((10 + Math.random() * 200) * 100) / 100;
}

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const ds = new DataSource({
    type: 'postgres',
    url,
    entities: [User, StoreEvent],
    synchronize: true,
  });
  await ds.initialize();
  const users = ds.getRepository(User);
  const events = ds.getRepository(StoreEvent);

  await events.createQueryBuilder().delete().execute();
  await users.createQueryBuilder().delete().execute();

  const password = process.env.SEED_PASSWORD ?? 'demo1234';
  const hash = await bcrypt.hash(password, 10);

  const storeA = 'store_456';
  const storeB = 'store_789';

  await users.save([
    users.create({
      email: 'owner@store-a.test',
      password_hash: hash,
      store_id: storeA,
    }),
    users.create({
      email: 'owner@store-b.test',
      password_hash: hash,
      store_id: storeB,
    }),
  ]);

  /** Enough distinct IDs per store so "top 10 by revenue" can show 10 rows after seeding. */
  const productsA = Array.from({ length: 12 }, (_, i) => `prod_a${i + 1}`);
  const productsB = Array.from({ length: 12 }, (_, i) => `prod_b${i + 1}`);

  const rawCount = Number(process.env.SEED_EVENT_COUNT ?? 3500);
  const eventCount = Number.isFinite(rawCount)
    ? Math.min(Math.max(Math.floor(rawCount), 500), 200_000)
    : 3500;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const batch: StoreEvent[] = [];

  for (let i = 0; i < eventCount; i++) {
    const store = i % 2 === 0 ? storeA : storeB;
    const products = store === storeA ? productsA : productsB;
    const type = randomItem(EVENT_TYPES);
    const ts = new Date(now - Math.random() * 45 * dayMs);
    const eventId = `evt_${store}_${i}`;
    let data: Record<string, unknown> = {};
    if (type === 'purchase') {
      data = {
        product_id: randomItem(products),
        amount: randomAmount(),
        currency: 'USD',
      };
    } else if (type === 'add_to_cart' || type === 'remove_from_cart') {
      data = { product_id: randomItem(products) };
    }
    batch.push(
      events.create({
        event_id: eventId,
        store_id: store,
        event_type: type,
        timestamp: ts,
        data,
      }),
    );
  }

  await events.save(batch, { chunk: 500 });
  await ds.destroy();
  console.log(
    `Seed complete: ${eventCount} events, 2 users (owner@store-a.test, owner@store-b.test), password:`,
    password,
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
