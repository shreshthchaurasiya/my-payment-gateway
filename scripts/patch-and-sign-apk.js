import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔧 Starting APK patch for FamPay / PhonePe / GPay support...');

const apkPath = path.resolve(rootDir, 'apps/android-observer-app/youpi-sms-gateway.apk');
const tmpDir = path.resolve(rootDir, '.tmp_patch_apk');
if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });

// 1. Unzip APK
execSync(`unzip -q -o "${apkPath}" -d "${tmpDir}"`);

const dexPath = path.join(tmpDir, 'classes.dex');
const dex = fs.readFileSync(dexPath);

// Adler-32 calculation for dex header
function adler32(buf, start = 0, end = buf.length) {
  let a = 1, b = 0;
  for (let i = start; i < end; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

// 2. Patch string: "deposit" (7 bytes) -> "fampaid" (7 bytes)
const depBuf = Buffer.from('deposit', 'utf8');
const famBuf = Buffer.from('fampaid', 'utf8');
const depIdx = dex.indexOf(depBuf);
if (depIdx === -1) {
  throw new Error('"deposit" string not found in classes.dex');
}
famBuf.copy(dex, depIdx);
console.log(`✅ Patched "deposit" -> "fampaid" at offset ${depIdx}`);

// 3. Patch string: "paid you" (8 bytes) -> "sent you" (8 bytes)
const paidYouBuf = Buffer.from('paid you', 'utf8');
const sentYouBuf = Buffer.from('sent you', 'utf8');
const paidYouIdx = dex.indexOf(paidYouBuf);
if (paidYouIdx === -1) {
  throw new Error('"paid you" string not found in classes.dex');
}
sentYouBuf.copy(dex, paidYouIdx);
console.log(`✅ Patched "paid you" -> "sent you" at offset ${paidYouIdx}`);

// 4. Recompute SHA-1 (offset 12..31) from byte 32 to end
const sha1Hash = crypto.createHash('sha1').update(dex.subarray(32)).digest();
sha1Hash.copy(dex, 12);
console.log(`✅ Recomputed SHA-1 signature: ${sha1Hash.toString('hex')}`);

// 5. Recompute Adler-32 (offset 8..11) from byte 12 to end
const adler = adler32(dex, 12);
dex.writeUInt32LE(adler, 8);
console.log(`✅ Recomputed Adler-32 checksum: ${adler}`);

fs.writeFileSync(dexPath, dex);

// 6. Remove existing signature from APK directory
const metaInf = path.join(tmpDir, 'META-INF');
if (fs.existsSync(metaInf)) {
  fs.rmSync(metaInf, { recursive: true, force: true });
}

// 7. Zip modified files into unaligned/unsigned APK
const unsignedApk = path.join(tmpDir, 'unsigned.apk');
process.chdir(tmpDir);
execSync(`zip -q -r "${unsignedApk}" AndroidManifest.xml res resources.arsc classes.dex`);
process.chdir(rootDir);

// 8. Sign APK with uber-apk-signer
const signerJar = '/tmp/uber-apk-signer.jar';
const javaBin = '/usr/lib/jvm/java-25-openjdk/bin/java';
console.log('🔏 Signing patched APK with Android v1 + v2 + v3 cryptographic certificate...');
execSync(`"${javaBin}" -jar "${signerJar}" --apks "${unsignedApk}" --out "${tmpDir}"`, {
  stdio: 'inherit'
});

// Locate signed APK
const signedApk = fs.readdirSync(tmpDir).find(f => f.endsWith('-aligned-debugSigned.apk') || f.endsWith('-signed.apk') || f.endsWith('unsigned.apk'));
const finalApkPath = path.join(tmpDir, signedApk || 'unsigned.apk');

const finalBuffer = fs.readFileSync(finalApkPath);
console.log(`📦 Final Signed APK size: ${finalBuffer.length.toLocaleString()} bytes`);

// 9. Distribute to endpoints
const targets = [
  path.resolve(rootDir, 'apps/android-observer-app/youpi-sms-gateway.apk'),
  path.resolve(rootDir, 'apps/payment-api/public/youpi-sms-gateway.apk'),
  path.resolve(rootDir, 'apps/dashboard/public/youpi-sms-gateway.apk')
];

for (const t of targets) {
  const dir = path.dirname(t);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(t, finalBuffer);
  console.log(`🎉 Saved updated APK: ${t}`);
}

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('\n✨ Patch and signing completed successfully!');
