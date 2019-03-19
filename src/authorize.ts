import { google } from 'googleapis';
import path from 'path'
import { readFile, writeFile, askAuthorizedCode } from './utils';
import { OAuth2Client } from 'google-auth-library';

// If modifying these scopes, delete token.json.
const scope = ['https://www.googleapis.com/auth/gmail.readonly'];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const CREDENTIAL_PATH = path.resolve(__dirname, '../credentials.json');
const TOKEN_PATH = path.resolve(__dirname, '../token.json');

export async function authorize(): Promise<OAuth2Client> {
  try {
    const contents = await readFile(CREDENTIAL_PATH);
    const credentials = JSON.parse(contents);
    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    try {
      const tokens = await readFile(TOKEN_PATH);
      oAuth2Client.setCredentials(JSON.parse(tokens));
      return oAuth2Client;
    } catch (error) {
      // Get new token
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope,
      });
      console.log('Authorize this app by visiting this url:', authUrl);
      const code = await askAuthorizedCode();
      const { tokens } = await oAuth2Client.getToken(code);

      // Store the token to disk for later program executions
      await writeFile(TOKEN_PATH, JSON.stringify(tokens));

      oAuth2Client.setCredentials(tokens);
      return oAuth2Client;
    }
  } catch (error) {
    console.error('Error loading client secret file:', error);
    throw new Error('Error loading client secret file');
  }
}
