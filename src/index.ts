import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { authorize } from './authorize';
import { Gmail } from './gmail';
import { sendSMS } from './sms';

async function main() {
  const auth = await authorize();
  const gmail = new Gmail(auth);
  const messages = await gmail.retrieve();
  if (messages && messages.length) {
    await sendSMS(messages);
  }
  return;
}

main().catch(console.error);
