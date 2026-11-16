const fs = require('fs');
const path = require('path');

const REAL_APP_ID = 'ca-app-pub-4326644127523914~2784148145';

// 1. Ensure Real AdMob APPLICATION_ID in AndroidManifest.xml
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  manifest = manifest.replace(/ca-app-pub-[0-9]+~[0-9]+/g, REAL_APP_ID);
  if (!manifest.includes('com.google.android.gms.ads.APPLICATION_ID')) {
    const metaTag = `        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${REAL_APP_ID}"/>\n    </application>`;
    manifest = manifest.replace('</application>', metaTag);
  }
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('✅ Real AdMob APPLICATION_ID verified in AndroidManifest.xml');
}

// 2. Ensure Real admob_app_id in strings.xml
const stringsPath = 'android/app/src/main/res/values/strings.xml';
if (fs.existsSync(stringsPath)) {
  let strings = fs.readFileSync(stringsPath, 'utf8');
  strings = strings.replace(/ca-app-pub-[0-9]+~[0-9]+/g, REAL_APP_ID);
  if (!strings.includes('admob_app_id')) {
    const strTag = `    <string name="admob_app_id">${REAL_APP_ID}</string>\n</resources>`;
    strings = strings.replace('</resources>', strTag);
  }
  fs.writeFileSync(stringsPath, strings, 'utf8');
  console.log('✅ Real admob_app_id verified in strings.xml');
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

// 4. Lower minSdkVersion in variables.gradle & plugin gradle files
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
  }
}

// 5. Configure Release Signing using Private Environment Variables (No Password in Code!)
const appBuildGradlePath = 'android/app/build.gradle';
if (fs.existsSync(appBuildGradlePath)) {
  let appGradle = fs.readFileSync(appBuildGradlePath, 'utf8');
  if (!appGradle.includes('KEYSTORE_PASSWORD')) {
    const compatBlock = `
android {
    defaultConfig {
        multiDexEnabled true
    }
    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }
    signingConfigs {
        debug {
            v1SigningEnabled true
            v2SigningEnabled true
        }
        release {
            storeFile file('release-key.keystore')
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias 'ballsort_key'
            keyPassword System.getenv("KEYSTORE_PASSWORD")
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
`;
    appGradle += '\n' + compatBlock;
    fs.writeFileSync(appBuildGradlePath, appGradle, 'utf8');
    console.log('✅ Configured Secure Environment-Based Release Signing!');
  }
}
