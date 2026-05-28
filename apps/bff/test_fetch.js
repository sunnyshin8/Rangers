(async () => {
  try {
    const url = process.env.TEST_URL;
    if (!url) throw new Error('Set TEST_URL env var');
    const res = await fetch(url);
    console.log('STATUS', res.status);
    const t = await res.text();
    console.log(t.slice(0, 2000));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
