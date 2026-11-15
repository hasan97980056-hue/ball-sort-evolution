const fs = require('fs');

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  if (!manifest.includes('com.google.android.gms.ads.APPLICATION_ID')) {
    const metaTag = '        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-3940256099942544~3347511713"/>\n    </application>';
    manifest = manifest.replace('</application>', metaTag);
    fs.writeFileSync(manifestPath, manifest, 'utf8');
    console.log('AdMob APPLICATION_ID added to AndroidManifest.xml');
  }
}

const stringsPath = 'android/app/src/main/res/values/strings.xml';
if (fs.existsSync(stringsPath)) {
  let strings = fs.readFileSync(stringsPath, 'utf8');
  if (!strings.includes('admob_app_id')) {
    const strTag = '    <string name="admob_app_id">ca-app-pub-3940256099942544~3347511713</string>\n</resources>';
    strings = strings.replace('</resources>', strTag);
    fs.writeFileSync(stringsPath, strings, 'utf8');
    console.log('admob_app_id added to strings.xml');
  }
}


// --- Set Custom Game Launcher Icon ---
const { execSync } = require('child_process');
const path = require('path');

if (fs.existsSync('app-icon.jpg')) {
  try {
    // Convert JPG to genuine PNG for Android aapt2 compiler
    execSync('ffmpeg -y -i app-icon.jpg app-icon.png', { stdio: 'ignore' });
    
    const resDir = 'android/app/src/main/res';
    const mipmaps = [
      'mipmap-mdpi',
      'mipmap-hdpi',
      'mipmap-xhdpi',
      'mipmap-xxhdpi',
      'mipmap-xxxhdpi'
    ];

    for (const folder of mipmaps) {
      const targetDir = path.join(resDir, folder);
      if (fs.existsSync(targetDir)) {
        fs.copyFileSync('app-icon.png', path.join(targetDir, 'ic_launcher.png'));
        fs.copyFileSync('app-icon.png', path.join(targetDir, 'ic_launcher_round.png'));
        fs.copyFileSync('app-icon.png', path.join(targetDir, 'ic_launcher_foreground.png'));
      }
    }

    // Remove default adaptive vector XML so Android uses our custom icon directly
    const anyDpiDir = path.join(resDir, 'mipmap-anydpi-v26');
    if (fs.existsSync(anyDpiDir)) {
      fs.rmSync(anyDpiDir, { recursive: true, force: true });
    }
    console.log('Custom Game Icon successfully applied to all Android mipmap folders!');
  } catch (err) {
    console.error('Icon setup error:', err);
  }
}
