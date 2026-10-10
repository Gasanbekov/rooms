import { createApp } from './app.js';
import { pool } from './db.js';

const port = Number(process.env.PORT) || 3000;

const server = createApp({ pool });

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
