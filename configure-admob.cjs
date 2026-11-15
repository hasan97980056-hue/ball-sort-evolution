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
