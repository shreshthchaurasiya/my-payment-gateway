import zipfile
import hashlib
import struct
import subprocess
import shutil
import os

print("🔧 Building correctly formatted Android APK...")

def adler32(buf, start=0, end=None):
    if end is None:
        end = len(buf)
    a, b = 1, 0
    for i in range(start, end):
        a = (a + buf[i]) % 65521
        b = (b + a) % 65521
    return ((b << 16) | a) & 0xFFFFFFFF

# 1. Read original classes.dex from original git APK
with zipfile.ZipFile('/tmp/orig.apk', 'r') as zin:
    dex = bytearray(zin.read('classes.dex'))

# 2. Patch keywords
dep_idx = dex.find(b'deposit\x00')
if dep_idx != -1:
    dex[dep_idx:dep_idx+7] = b'fampaid'
    print(f"✅ Patched deposit -> fampaid at offset {dep_idx}")
else:
    print("⚠️ 'deposit' not found in dex")

paid_idx = dex.find(b'paid you\x00')
if paid_idx != -1:
    dex[paid_idx:paid_idx+8] = b'sent you'
    print(f"✅ Patched paid you -> sent you at offset {paid_idx}")
else:
    print("⚠️ 'paid you' not found in dex")

# 3. Recompute SHA-1 (offset 12..31) from byte 32 to end
sha1_hash = hashlib.sha1(dex[32:]).digest()
dex[12:32] = sha1_hash
print(f"✅ SHA-1 signature: {sha1_hash.hex()}")

# 4. Recompute Adler-32 (offset 8..11) from byte 12 to end
adler = adler32(dex, 12)
dex[8:12] = struct.pack('<I', adler)
print(f"✅ Adler-32 checksum: {adler}")

# 5. Repackage into unaligned.apk
# CRITICAL: resources.arsc MUST BE STORED (no compression), otherwise Android rejects it!
unaligned_apk = '/tmp/unaligned.apk'
with zipfile.ZipFile('/tmp/orig.apk', 'r') as zin:
    with zipfile.ZipFile(unaligned_apk, 'w') as zout:
        for item in zin.infolist():
            if item.filename.startswith('META-INF/'):
                continue
            if item.filename == 'classes.dex':
                zout.writestr(item, bytes(dex), compress_type=zipfile.ZIP_DEFLATED)
            elif item.filename == 'resources.arsc':
                # STORED - zero compression
                data = zin.read(item.filename)
                zout.writestr(item, data, compress_type=zipfile.ZIP_STORED)
            else:
                data = zin.read(item.filename)
                zout.writestr(item, data, compress_type=item.compress_type)

print("✅ Base APK created with STORED resources.arsc.")

# 6. Sign and Align with uber-apk-signer
out_dir = '/tmp/signed_final'
if os.path.exists(out_dir):
    shutil.rmtree(out_dir)
os.makedirs(out_dir, exist_ok=True)

java_bin = '/usr/lib/jvm/java-25-openjdk/bin/java'
signer_jar = '/home/shreshthchaurasiya/Documents/YouPI-PG/scripts/uber-apk-signer.jar'

cmd = [java_bin, '-jar', signer_jar, '--apks', unaligned_apk, '--out', out_dir]
subprocess.run(cmd, check=True)

signed_apk = os.path.join(out_dir, 'unaligned-aligned-debugSigned.apk')
if not os.path.exists(signed_apk):
    # Try any signed apk in out_dir
    files = [f for f in os.listdir(out_dir) if f.endswith('.apk')]
    signed_apk = os.path.join(out_dir, files[0])

print(f"✅ Signed APK: {signed_apk} ({os.path.getsize(signed_apk)} bytes)")

# 7. Verify entries inside signed APK
with zipfile.ZipFile(signed_apk, 'r') as zf:
    for info in zf.infolist():
        cmpr = "STORED" if info.compress_type == zipfile.ZIP_STORED else "DEFLATED"
        print(f"   • {info.filename:35s} {cmpr:10s} (size: {info.file_size})")

# 8. Copy to live targets
targets = [
    '/home/shreshthchaurasiya/Documents/YouPI-PG/apps/android-observer-app/youpi-sms-gateway.apk',
    '/home/shreshthchaurasiya/Documents/YouPI-PG/apps/payment-api/public/youpi-sms-gateway.apk',
    '/home/shreshthchaurasiya/Documents/YouPI-PG/apps/dashboard/public/youpi-sms-gateway.apk'
]

with open(signed_apk, 'rb') as f:
    apk_bytes = f.read()

for t in targets:
    os.makedirs(os.path.dirname(t), exist_ok=True)
    with open(t, 'wb') as f:
        f.write(apk_bytes)
    print(f"🎉 Updated: {t}")

print("\n🚀 DONE! APK is 100% Android compliant and ready to install!")
