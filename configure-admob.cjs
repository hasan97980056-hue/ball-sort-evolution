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

// 3. Copy pre-generated PNG icons into Android mipmap folders
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

for (const dirName of ['mipmap-anydpi-v26', 'mipmap-anydpi']) {
  const anyDpiDir = path.join(resDir, dirName);
  if (fs.existsSync(anyDpiDir)) {
    fs.rmSync(anyDpiDir, { recursive: true, force: true });
  }
}
console.log('✅ All Custom PNG Game Icons applied successfully!');

// 4. Lower minSdkVersion in variables.gradle & plugin gradle files for backward compatibility
const gradleFilesToPatch = [
  'android/variables.gradle',
  'node_modules/@capacitor/android/capacitor/build.gradle',
  'node_modules/@capacitor-community/admob/android/build.gradle'
];

for (const gFile of gradleFilesToPatch) {
  if (fs.existsSync(gFile)) {
    let content = fs.readFileSync(gFile, 'utf8');
    content = content.replace(/minSdkVersion\s*=\s*\d+/g, 'minSdkVersion = 21');
    content = content.replace(/minSdk\s+\d+/g, 'minSdk 21');
    fs.writeFileSync(gFile, content, 'utf8');
    console.log(`✅ Updated minSdkVersion to 21 in ${gFile}`);
  }
}

// 5. Enable V1 + V2 APK Signing and MultiDex in android/app/build.gradle for Android 9 / MIUI 12
const appBuildGradlePath = 'android/app/build.gradle';
if (fs.existsSync(appBuildGradlePath)) {
  let appGradle = fs.readFileSync(appBuildGradlePath, 'utf8');
  if (!appGradle.includes('v1SigningEnabled')) {
    const compatBlock = `
android {
    defaultConfig {
        multiDexEnabled true
    }
    signingConfigs {
        debug {
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
    }
}
`;
    appGradle += '\n' + compatBlock;
    fs.writeFileSync(appBuildGradlePath, appGradle, 'utf8');
    console.log('✅ Enabled V1 + V2 APK Signing and MultiDex for Android 9 compatibility!');
  }
}
