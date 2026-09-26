#!/usr/bin/env node
// Cursor on Windows runs hooks through Windows PowerShell, which pipes stdin as UTF-8
// with a BOM. The Impeccable engine rejects that as malformed and allows every write.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const isWindows = process.platform === 'win32';
const launcher = fileURLToPath(
  new URL(`../skills/impeccable/scripts/impeccable${isWindows ? '.cmd' : ''}`, import.meta.url),
);

if (!existsSync(launcher)) process.exit(0);

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
let input = Buffer.concat(chunks);
if (input[0] === 0xef && input[1] === 0xbb && input[2] === 0xbf) input = input.subarray(3);

const stdio = ['pipe', 'inherit', 'inherit'];
const child = isWindows
  ? spawn(`"${launcher}" hook-before-edit`, { stdio, shell: true })
  : spawn(launcher, ['hook-before-edit'], { stdio });
child.on('error', () => process.exit(0));
child.on('exit', (code) => process.exit(code ?? 1));
child.stdin.end(input);
