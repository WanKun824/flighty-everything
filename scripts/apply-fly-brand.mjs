// Mechanical branding update; does not change identifiers or saved user data.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) throw new Error('Pass the generated FLY master image path.');
const paths = execFileSync('git', ['ls-files', 'app', 'native', 'capacitor.config.ts', 'ios/App/App/Info.plist', 'android/app/src/main/res/values/strings.xml'], { encoding: 'utf8' }).trim().split('\n');
for (const path of paths.filter(path => /\.(tsx?|html|plist|xml)$/.test(path))) {
  const original = await readFile(path, 'utf8');
  const updated = original.replaceAll('flighty Everything', 'fly everything')
    .replaceAll('MY FLIGHTY EVERYTHING PASSPORT', 'MY FLY EVERYTHING PASSPORT')
    .replaceAll('flighty <em>Everything</em>', 'fly <em>everything</em>');
  if (updated !== original) await writeFile(path, updated);
}
await mkdir('public/brand', { recursive: true });
// Export dimensions and remove alpha for Xcode; preserve the generated artwork.
const icon = await sharp(source).resize(1024, 1024).flatten({ background: '#000000' }).removeAlpha().png().toBuffer();
await writeFile('public/brand/fly-icon.png', icon);
await writeFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', icon);
await sharp(icon).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(icon).resize(64, 64).png().toFile('public/favicon.png');
console.log('Applied fly everything branding and exported the iOS icon.');
