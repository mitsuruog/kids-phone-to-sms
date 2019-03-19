import fs from 'fs';
import readline from 'readline';

export function readFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (error: NodeJS.ErrnoException, data) => {
      if (error) {
        reject(error);
      }
      resolve(data);
    });
  });
}

export function writeFile(path: string, contents: string) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, contents, (error: NodeJS.ErrnoException) => {
      if (error) {
        reject(error);
      }
      resolve();
    });
  });
}

export function askAuthorizedCode(): Promise<string> {
  return new Promise(resolve => {
    const steps = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    steps.question('Enter the code from that page here: ', (code: string) => {
      steps.close();
      resolve(code);
    });
  });
}
