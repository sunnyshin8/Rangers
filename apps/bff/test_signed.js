const fetch = globalThis.fetch;
(async () => {
  try {
    const token = process.env.TEST_TOKEN || '';
    const res = await fetch('http://127.0.0.1:4000/api/evidence/ev-demo-aws-1/signed', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttlSeconds: 3600 }),
    });
    const body = await res.text();
    console.log('STATUS', res.status);
    console.log(body);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
