import { net, protocol } from 'electron';
import { join, normalize } from 'path';
import { pathToFileURL } from 'url';
import { COVERS_HOST, coversDir } from './services/audioService';

// Cover images live on disk (userData/covers) rather than in the database, so
// the renderer reaches them through a private scheme instead of a file:// URL.
// Must run before the app is ready, hence the module-level call.
protocol.registerSchemesAsPrivileged([
  { scheme: 'mtfile', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

export function registerFileProtocol(): void {
  protocol.handle('mtfile', async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== COVERS_HOST) return new Response('Not found', { status: 404 });

    const name = decodeURIComponent(url.pathname.replace(/^\//, ''));
    const dir = coversDir();
    const target = normalize(join(dir, name));
    if (!target.startsWith(normalize(dir))) return new Response('Forbidden', { status: 403 });

    return net.fetch(pathToFileURL(target).toString());
  });
}
