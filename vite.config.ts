import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { handleApiRequest } from './server/apiRouter';
import { startBackgroundScheduler } from './server/scheduler';

function apiServerPlugin(): Plugin {
  return {
    name: 'healthpulse-api-server',
    configureServer(server) {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      startBackgroundScheduler(appUrl);

      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          try {
            const handled = await handleApiRequest(req, res, appUrl);
            if (!handled) {
              next();
            }
          } catch (err: any) {
            console.error('API Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Server error' }));
          }
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
