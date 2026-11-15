const fs = require('fs');
const path = require('path');

// 1. Inject AdMob APPLICATION_ID in AndroidManifest.xml
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  if (!manifest.includes('com.google.android.gms.ads.APPLICATION_ID')) {
    const metaTag = '        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-3940256099942544~3347511713"/>\n    </application>';
    manifest = manifest.replace('</application>', metaTag);
    fs.writeFileSync(manifestPath, manifest, 'utf8');
    console.log('✅ AdMob APPLICATION_ID added to AndroidManifest.xml');
  }
}

// 2. Inject admob_app_id in strings.xml
const stringsPath = 'android/app/src/main/res/values/strings.xml';
if (fs.existsSync(stringsPath)) {
  let strings = fs.readFileSync(stringsPath, 'utf8');
  if (!strings.includes('admob_app_id')) {
    const strTag = '    <string name="admob_app_id">ca-app-pub-3940256099942544~3347511713</string>\n</resources>';
    strings = strings.replace('</resources>', strTag);
    fs.writeFileSync(stringsPath, strings, 'utf8');
    console.log('✅ admob_app_id added to strings.xml');
  }
}

// 3. Copy pre-generated PNG icons into Android mipmap folders using pure Node.js
const resDir = 'android/app/src/main/res';
const folders = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];

for (const folder of folders) {
  const srcPng = path.join('custom-icons', `${folder}.png`);
  const targetDir = path.join(resDir, folder);
  if (fs.existsSync(srcPng) && fs.existsSync(targetDir)) {
    fs.copyFileSync(srcPng, path.join(targetDir, 'ic_launcher.png'));
    fs.copyFileSync(srcPng, path.join(targetDir, 'ic_launcher_round.png'));
    fs.copyFileSync(srcPng, path.join(targetDir, 'ic_launcher_foreground.png'));
  }
}

// Delete adaptive vector XML folders so Android uses our custom PNG icons directly
for (const dirName of ['mipmap-anydpi-v26', 'mipmap-anydpi']) {
  const anyDpiDir = path.join(resDir, dirName);
  if (fs.existsSync(anyDpiDir)) {
    fs.rmSync(anyDpiDir, { recursive: true, force: true });
    console.log(`✅ Removed ${dirName} so custom icon is used`);
  }
}

console.log('✅ All Custom PNG Game Icons applied successfully!');
