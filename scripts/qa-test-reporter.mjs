export default async function* report(events) {
  for await (const event of events) {
    if (event.type === 'test:fail') yield `FAIL: ${event.data.name}\n${String(event.data.details?.error?.cause?.message ?? event.data.details?.error?.message ?? '').split('\n')[0]}\n`;
    if (event.type === 'test:summary') yield JSON.stringify(event.data) + '\n';
  }
}
