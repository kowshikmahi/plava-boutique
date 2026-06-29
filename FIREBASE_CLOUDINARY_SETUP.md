# Firebase + Cloudinary Setup for Plava

## Firebase admin login and Firestore

1. Create a Firebase project.
2. In Firebase Authentication, enable Email/Password sign-in.
3. Add this admin user:
   - Email: kowshikmahi1209@gmail.com
   - Password: set your private Firebase password in the Firebase Console.
4. Create a Firestore database.
5. Copy your Firebase web app config into `assets/js/firebase-config.js`.
6. Use these Firestore security rules:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sites/plava {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email == 'kowshikmahi1209@gmail.com';
    }
  }
}
```

## Cloudinary free file uploads

1. Create a Cloudinary account.
2. Copy your cloud name into `assets/js/cloudinary-config.js`.
3. In Cloudinary Settings > Upload, create an unsigned upload preset.
4. Copy that unsigned preset name into `assets/js/cloudinary-config.js`.
5. Keep the folder as `plava` or rename it if you want uploads grouped differently.

The website uses Firebase only for admin login and shared content records. Images and files uploaded through the admin panel go to Cloudinary and the returned URL is saved in Firestore.
