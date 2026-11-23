# Push Notification (FCM)

1. `npm install`
2. Build ulang dev client (ada native module baru): `eas build --profile development --platform android`
3. Deploy backend (butuh Blaze plan):
   ```
   cd functions && npm install && cd ..
   firebase deploy --only functions,firestore:rules
   ```
   Sesuaikan `region` di `functions/index.js` dengan lokasi Firestore.
4. Uji: sesi dibuka, jadwal diubah, izin diterima/ditolak, di kondisi foreground / background / app mati, izin notifikasi ditolak, dan setelah logout.
