# Transaction-Tracker-pro

Sistema de Gestion de negocio

## Getting Started

First, you need to create a `.env.local` file in the root of the project and add your Firebase project's configuration. You can find this configuration in the Firebase console.

```
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-auth-domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
```

Next, you need to deploy the Firestore security rules. You can do this using the Firebase CLI.

```
firebase deploy --only firestore:rules
```

Finally, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
