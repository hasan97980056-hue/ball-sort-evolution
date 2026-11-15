const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// 3. Replace all Android Launcher Icons with app-icon.jpg
if (fs.existsSync('app-icon.jpg')) {
  const resDir = 'android/app/src/main/res';
  const mipmapSizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
  };

  for (const [folder, size] of Object.entries(mipmapSizes)) {
    const targetDir = path.join(resDir, folder);
    if (fs.existsSync(targetDir)) {
      const outPng = path.join(targetDir, 'ic_launcher.png');
      const outRound = path.join(targetDir, 'ic_launcher_round.png');
      const outFg = path.join(targetDir, 'ic_launcher_foreground.png');

      execSync(`ffmpeg -y -i app-icon.jpg -vf "scale=${size}:${size}" "${outPng}"`, { stdio: 'ignore' });
      fs.copyFileSync(outPng, outRound);
      fs.copyFileSync(outPng, outFg);
    }
  }

  // Delete adaptive vector icon folders so Android uses our PNG icon directly
  for (const dirName of ['mipmap-anydpi-v26', 'mipmap-anydpi']) {
    const anyDpiDir = path.join(resDir, dirName);
    if (fs.existsSync(anyDpiDir)) {
      fs.rmSync(anyDpiDir, { recursive: true, force: true });
      console.log(`✅ Removed ${dirName} so custom icon is used`);
    }
  }
  console.log('✅ Custom Game Icon applied to all mipmap folders!');
} else {
  console.error('❌ app-icon.jpg not found during build!');
  process.exit(1);
}
