import fs from 'fs';

const html = fs.readFileSync('C:\\Users\\ADMINI~1\\AppData\\Local\\Temp\\douyin_html.txt', 'utf8');

const scriptTags = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];

console.log('Found', scriptTags.length, 'script tags');

for (let i = 0; i < scriptTags.length; i++) {
  const script = scriptTags[i];
  if (script.includes('track_id') || script.includes('aweme_id') || script.includes('video_id') || script.includes('music') || script.includes('title')) {
    console.log('\n=== Script', i, '===');
    const cleaned = script.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
    console.log(cleaned.substring(0, 1000));
  }
}

const routerDataMatch = html.match(/<script[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/script>/);
if (routerDataMatch) {
  console.log('\n=== Router Data ===');
  console.log('ID:', routerDataMatch[1]);
  console.log(routerDataMatch[2].substring(0, 2000));
}

const urlParamsMatch = html.match(/track_id=(\d+)/);
if (urlParamsMatch) {
  console.log('\n=== Found track_id:', urlParamsMatch[1]);
}
