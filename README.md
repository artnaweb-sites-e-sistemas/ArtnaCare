# ArtnaCare SaaS

ArtnaCare is a modern SaaS dashboard for monitoring and maintaining WordPress sites. It provides a centralized view of client sites, their health status, uptime, performance, and maintenance history, complete with automated monthly reporting.

## Features

- **Client & Site Management:** Track WordPress sites grouped by clients.
- **Automated Monitoring:** Daily checks for HTTP status, SSL validity, and basic WordPress health (`/wp-json`).
- **Advanced Monitoring Support:** Integrates with a custom `artnacare` WordPress plugin (`/wp-json/artnacare/v1/status`) for deep insights (plugins, themes, core version, PHP version).
- **External Integrations:** Prepared for UptimeRobot, Google PageSpeed, WPScan, and Sucuri.
- **Maintenance Logs:** Keep a timeline of updates and fixes applied to each site.
- **Automated Reporting:** Generate and email monthly HTML reports to clients using Resend.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI & Styling:** Tailwind CSS + Shadcn UI
- **Database & Auth:** Firebase (Firestore + Firebase Authentication)
- **Email Delivery:** Resend
- **Icons:** Lucide React
- **Charts:** Recharts

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.17 or later
- A Firebase project (with Authentication and Firestore enabled)
- A Resend API key (for emails)

### 1. Clone & Install

```bash
git clone <repository-url>
cd Repositorio - ArtnaCare
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory and configure the following variables:

```env
# -----------------------------------------------------------------------------
# FIREBASE CLIENT CONFIG (Get this from Project Settings > General > Web App)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"

# -----------------------------------------------------------------------------
# FIREBASE ADMIN SDK CONFIG (Get this from Project Settings > Service Accounts)
# -----------------------------------------------------------------------------
# You must generate a new private key JSON file and extract these values.
# IMPORTANT: Format the private key with actual \n characters in the string.
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# -----------------------------------------------------------------------------
# EXTERNAL APIS
# -----------------------------------------------------------------------------
RESEND_API_KEY="your-resend-api-key"
UPTIMEROBOT_API_KEY="optional-uptimerobot-key"
SUCURI_API_KEY="optional-sucuri-key"
```

### 3. Firebase Setup Guide

1. **Create Project:** Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. **Enable Authentication:** Go to Authentication > Sign-in method. Enable **Email/Password**.
3. **Add First User:** Go to Authentication > Users. Add an admin user (e.g., `admin@artnacare.com`). This email will be used to log into the dashboard.
4. **Enable Firestore:** Go to Firestore Database. Create a database. Start in **Production Mode**.
5. **Set Security Rules:** For the MVP, you can use the following default rules to secure your data to authenticated users only:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You will be redirected to the `/login` page if you are not authenticated.

---

## 🛠 Features & Architecture

### Monitoring Engine (`/api/cron/monitoring`)
The system includes an endpoint that can be triggered by a CRON job (e.g., Vercel Cron or a standard UNIX cron) to loop through all sites and check their status. 
- It uses the standard `/wp-json` endpoint to verify if a site is a WordPress site.
- If the `artnacare` WP plugin is installed on the target site, it will query `/wp-json/artnacare/v1/status` to get deep system insights.

### Reporting Engine (`/api/cron/reports`)
This endpoint gathers the past month's metrics, maintenance logs, and site health, formats them into a professional HTML email template, and sends them to the client's email via Resend.

---

## 🚢 Deployment

The easiest way to deploy this application is with Vercel.

1. Push your code to a GitHub repository.
2. Sign in to [Vercel](https://vercel.com/) and import the repository.
3. During setup, unfold the **Environment Variables** section and paste ALL of your variables from `.env.local`.
4. Click **Deploy**.

*Note: For CRON jobs to work on Vercel, you need a `vercel.json` file defining your cron schedules.*

## 📄 License

Proprietary Software - ArtnaCare
