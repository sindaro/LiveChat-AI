async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/ai-suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'test.txt',
        content: 'This is a test document. We need to check if the fallback works.',
        businessId: '1e1bd1ef-7b79-41e9-913a-ce6945009121', // I will just mock it or assume it will fail with Business profile not found
        action: 'audit'
      })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
