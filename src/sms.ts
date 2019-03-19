import { gmail_v1, } from 'googleapis';
import AWS from 'aws-sdk';
import { PublishInput } from 'aws-sdk/clients/sns';

const AWS_REGION = process.env.KFTS_AWS_REGION || '';
const AWS_ACCESS_KEY_ID = process.env.KFTS_AWS_ACCESS_KEY_ID || '';
const AWS_SECRET_ACCESS_KEY = process.env.KFTS_AWS_SECRET_ACCESS_KEY || '';
const SMS_PHONE_NO = process.env.KFTS_SMS_PHONE_NO || '';

AWS.config.update({
  region: AWS_REGION,
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
});

export async function sendSMS(messages: gmail_v1.Schema$Message[]) {
  return await Promise.all(
    messages.map(async message => {
      const body = message.snippet || '（本文なし）';
      // Y!mobileは70文字制限らしい
      const subject = body.length <= 70 ? body : `${body.substring(0, 66)} ...`;
      const params: PublishInput = {
        Subject: subject,
        Message: body,
        PhoneNumber: SMS_PHONE_NO,
      };
      await new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();
    })
  );
}
