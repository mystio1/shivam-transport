import fs from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import { config } from './env.js';

// express.static handles real files (JS/CSS/images/etc); the fallback below serves index.html
// for anything else so React Router's client-side routes work on a hard refresh/deep link.
// Mirrors backend/server.mjs's serveStatic() including its "build the frontend first" message.
export function mountStatic(app: Express): void {
  app.use(express.static(config.distDir));
  app.use((_req, res) => {
    const indexPath = path.join(config.distDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      res.status(404).type('text/plain').send('Build the frontend first with: npm run build');
      return;
    }
    res.sendFile(indexPath);
  });
}
