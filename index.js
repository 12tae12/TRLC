addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const clients = new Map();

async function handleRequest(request) {
  const { pathname, searchParams } = new URL(request.url);

  if (pathname === '/signal') {
    const clientId = searchParams.get('id');
    const signal = await request.json();

    if (!clients.has(clientId)) {
      clients.set(clientId, new Set());
    }

    const clientSet = clients.get(clientId);
    clientSet.forEach(otherClient => otherClient.postMessage(JSON.stringify(signal)));

    return new Response(null, { status: 200 });
  }

  return new Response('Not Found', { status: 404 });
}

