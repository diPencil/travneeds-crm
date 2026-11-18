import { emitKeypressEvents } from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { z } from 'zod';
import { createInitialAdmin } from '../../server/src/modules/users/users.repository.js';
import { pool } from '../../server/src/database/pool.js';
import { HttpError } from '../../server/src/http/errors.js';

function secret(prompt: string): Promise<string> {
  if (!process.stdin.isTTY)
    throw new Error('Create the administrator from an interactive terminal.');
  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = () => {
      process.stdin.off('keypress', onKey);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    };
    const onKey = (text: string, key: { name: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === 'c') {
        finish();
        reject(new Error('Cancelled.'));
      } else if (key.name === 'return') {
        finish();
        resolve(value);
      } else if (key.name === 'backspace') value = value.slice(0, -1);
      else if (
        text &&
        !key.ctrl &&
        [...text].every(
          (character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
        )
      )
        value += text;
    };
    process.stdin.on('keypress', onKey);
  });
}

const terminal = createInterface({ input: process.stdin, output: process.stdout });
try {
  const fullName = z
    .string()
    .trim()
    .min(1)
    .max(160)
    .parse(await terminal.question('Full name: '));
  const email = z
    .string()
    .trim()
    .email()
    .max(254)
    .parse(await terminal.question('Email: '));
  terminal.close();
  const password = z
    .string()
    .min(12)
    .max(128)
    .parse(await secret('Password (hidden, minimum 12 characters): '));
  if (password !== (await secret('Confirm password: '))) throw new Error('Passwords do not match.');
  await createInitialAdmin(fullName, email, password);
  console.log('Administrator created. Sign in using the account you just entered.');
} catch (error) {
  const reason =
    error instanceof HttpError ? error.code : 'Check the account details and database connection.';
  console.error(`Administrator creation failed. ${reason}`);
  process.exitCode = 1;
} finally {
  terminal.close();
  await pool.end();
}
