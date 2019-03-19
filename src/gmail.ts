import { google, gmail_v1, } from 'googleapis';
import { OAuth2Client } from 'google-auth-library'
import path from 'path';
import { readFile, writeFile } from './utils';

const HISTORY_ID_PATH = path.resolve(__dirname, '../historyId.json');

const GMAIL_TARGET_LABEL = process.env.KFTS_GMAIL_TARGET_LABEL || '';

export class Gmail {
  private gmail: gmail_v1.Gmail;

  constructor(auth: OAuth2Client) {
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async retrieve() {
    const label = await this.getLabel();
    console.log({ label });
    if (!label) {
      return;
    }
    const historyId = await this.getLastHistoryId();
    console.log({ historyId });
    const history = await this.getHistory(historyId, label);
    console.log({ history });
    if (!history || !history.length) {
      return;
    }
    const messages = await this.getMessage(history, label);
    console.log({ messages });
    if (!messages || !messages.length) {
      return;
    }
    const lastHistoryId = await this.setLastHistoryId(messages);
    console.log({ lastHistoryId });
    return messages;
  }

  async getLabel() {
    const response = await this.gmail.users.labels.list({ userId: 'me' });
    const { labels } = response.data;
    if (!labels) {
      return;
    }
    return labels.find(label => {
      return (label.name || '').includes(GMAIL_TARGET_LABEL);
    });
  }

  async getHistory(startHistoryId: string, label: gmail_v1.Schema$Label) {
    const getPageOfHistory = async (response: gmail_v1.Schema$ListHistoryResponse, result: gmail_v1.Schema$History[]): Promise<gmail_v1.Schema$History[] | undefined> => {
      const { history, nextPageToken } = response;
      if (!history) {
        return history;
      }
      const mergedResult = [...result, ...history];
      if (nextPageToken) {
        const response = await this.gmail.users.history.list({
          userId: 'me',
          historyTypes: ['messageAdded'],
          labelId: label.id,
          pageToken: nextPageToken,
          startHistoryId,
        });
        return getPageOfHistory(response.data, mergedResult);
      } else {
        return mergedResult;
      }
    };

    const request = await this.gmail.users.history.list({
      userId: 'me',
      historyTypes: ['messageAdded'],
      labelId: label.id,
      startHistoryId,
    });

    return await getPageOfHistory(request.data, []) || [];
  }

  async getLastHistoryId() {
    try {
      const historyId = await readFile(HISTORY_ID_PATH);
      return JSON.parse(historyId);
    } catch (error) {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      const { historyId } = response.data;

      // Store the profile to disk for later program executions
      await writeFile(HISTORY_ID_PATH, JSON.stringify(historyId));
      return historyId;
    }
  }

  async setLastHistoryId(messages: gmail_v1.Schema$Message[]) {
    const historyIdPool = messages.map(message => message.historyId ? parseInt(message.historyId, 10) : 0);
    const lastHistoryId = Math.max(...historyIdPool);
    // Store the profile to disk for later program executions
    await writeFile(HISTORY_ID_PATH, JSON.stringify(lastHistoryId));
    return lastHistoryId;
  }

  async getMessage(history: gmail_v1.Schema$History[], label: gmail_v1.Schema$Label) {
    const messages = [] as gmail_v1.Schema$Message[];
    await Promise.all(
      history.map(async item => {
        if (item && item.messagesAdded) {
          return await Promise.all(
            item.messagesAdded
              .map(async addedMessage => {
                if (!addedMessage || !addedMessage.message || !addedMessage.message.labelIds) {
                  return;
                }
                if (!addedMessage.message.labelIds.includes(label.id || '')) {
                  return;
                }
                const response = await this.gmail.users.messages.get({
                  userId: 'me',
                  id: addedMessage.message.id,
                });
                messages.push(response.data);
              })
          );
        }
      })
    );
    return messages;
  }
}
