import * as dotenv from 'dotenv';
import { Kafka } from '@melonade/melonade-declaration';

dotenv.config();
const pickAndReplaceFromENV = (template: string) =>
  Object.keys(process.env).reduce((result: any, key: string) => {
    if (new RegExp(template).test(key)) {
      return {
        ...result,
        [key.replace(new RegExp(template), '')]: process.env[key],
      };
    }
    return result;
  }, {});

export const melonade = {
  namespace: process.env['melonade.namespace'] || 'default',
};

export const kafkaTopicName = {
  // Publish to specified task
  task: `${Kafka.topicPrefix}.${melonade.namespace}.${Kafka.topicSuffix.task}`,
  // Publish to system task
  systemTask: `${Kafka.topicPrefix}.${melonade.namespace}.${Kafka.topicSuffix.systemTask}`,
  // Publish to store event
  store: `${Kafka.topicPrefix}.${melonade.namespace}.${Kafka.topicSuffix.store}`,
  // Subscriptions to update event
  event: `${Kafka.topicPrefix}.${melonade.namespace}.${Kafka.topicSuffix.event}`,
  // Subscriptions to command
  command: `${Kafka.topicPrefix}.${melonade.namespace}.${Kafka.topicSuffix.command}`,
};

export const kafkaEventConfig = {
  config: {
    'enable.auto.commit': 'false',
    'group.id': `melonade-${melonade.namespace}-event`,
    ...pickAndReplaceFromENV('^kafka\\.conf\\.'),
    ...pickAndReplaceFromENV('^event\\.kafka\\.conf\\.'),
  },
  topic: {
    'auto.offset.reset': 'earliest',
    ...pickAndReplaceFromENV('^kafka\\.topic-conf\\.'),
    ...pickAndReplaceFromENV('^event\\.kafka\\.topic-conf\\.'),
  },
};

export const eventStore = {
  type: process.env['event-store.type'],
  elasticsearchConfig: {
    index: `melonade-${melonade.namespace}-event`,
    config: pickAndReplaceFromENV('^event-store\\.elasticsearch\\.'),
  },
};
