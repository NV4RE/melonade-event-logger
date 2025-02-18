import { Event, State } from '@melonade/melonade-declaration';
import { IAllEventWithId } from '../kafka';

export enum StoreType {
  MongoDB = 'MONGODB',
  Elasticsearch = 'ELASTICSEARCH',
}

export interface IStore {
  isHealthy(): boolean;
}

export interface ITransactionEventPaginate {
  total: number;
  events: Event.ITransactionEvent[];
}

export interface IEventDataStore extends IStore {
  getTransactionData(transactionId: string): Promise<Event.AllEvent[]>;
  listTransaction(
    statuses: State.TransactionStates[],
    fromTimestamp: number,
    toTimestamp: number,
    transactionId?: string,
    from?: number,
    size?: number,
  ): Promise<ITransactionEventPaginate>;
  create(event: Event.AllEvent): Promise<Event.AllEvent>;
  bulkCreate(events: IAllEventWithId[]): Promise<any[]>;
}

export class EventStore {
  client: IEventDataStore;

  setClient(client: IEventDataStore) {
    if (this.client) throw new Error('Already set client');
    this.client = client;
  }

  getTransactionData(transactionId: string): Promise<Event.AllEvent[]> {
    return this.client.getTransactionData(transactionId);
  }

  listTransaction(
    statuses: State.TransactionStates[] = [
      State.TransactionStates.Cancelled,
      State.TransactionStates.Compensated,
      State.TransactionStates.Completed,
      State.TransactionStates.Failed,
      State.TransactionStates.Paused,
      State.TransactionStates.Running,
    ],
    fromTimestamp: number,
    toTimestamp: number,
    transactionId?: string,
    from?: number,
    size?: number,
  ): Promise<ITransactionEventPaginate> {
    return this.client.listTransaction(
      statuses,
      fromTimestamp || 0,
      toTimestamp || Date.now(),
      transactionId,
      from,
      size,
    );
  }

  create(events: Event.AllEvent): Promise<Event.AllEvent> {
    return this.client.create(events);
  }

  bulkCreate(events: IAllEventWithId[]): Promise<any[]> {
    return this.client.bulkCreate(events);
  }
}

// This's global instance
export const eventStore = new EventStore();
