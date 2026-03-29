import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type EventType =
  | 'page_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_started'
  | 'purchase';

@Entity('events')
@Index(['store_id', 'timestamp'])
@Index(['store_id', 'event_type'])
export class StoreEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  event_id: string;

  @Column({ type: 'varchar', length: 64 })
  store_id: string;

  @Column({ type: 'varchar', length: 32 })
  event_type: string;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, unknown>;
}
