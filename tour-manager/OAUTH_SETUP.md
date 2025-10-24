# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth for the Band Merch POS app.

## Prerequisites
- A Google Cloud project (you already have "Tour Manager")
- Access to Google Cloud Console

## Step 1: Enable Required APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your **Tour Manager** project
3. Navigate to **APIs & Services** > **Library**
4. Search for and enable:
   - **Google Sheets API**
   - **Google Drive API** (if not already enabled)

## Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace)
3. Fill in the required fields:
   - **App name**: Band Merch POS
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **Save and Continue**
5. On **Scopes** page, click **Add or Remove Scopes**
6. Add these scopes:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.file`
7. Click **Update** then **Save and Continue**
8. Skip **Test users** (or add yourself if in testing mode)
9. Click **Save and Continue** and then **Back to Dashboard**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: Band Merch POS (or any name)
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://your-app.vercel.app` (add later for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://your-app.vercel.app/api/auth/callback/google` (add later for production)
5. Click **Create**
6. **Copy your Client ID and Client Secret** (you'll need these next)

## Step 4: Configure Environment Variables

1. In your project directory, create a `.env.local` file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-random-secret
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

3. Generate a random secret for `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and paste it as your `NEXTAUTH_SECRET`

## Step 5: Test Authentication

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. You should be redirected to the sign-in page

4. Click **Sign in with Google**

5. You'll be asked to:
   - Choose your Google account
   - Grant permission to access Google Sheets and Drive
   - Click **Allow**

6. You should be redirected back to the app and signed in!

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure your redirect URI in Google Cloud Console exactly matches: `http://localhost:3000/api/auth/callback/google`
- Check for typos, extra slashes, or http vs https

### "Access blocked: This app's request is invalid"
- Make sure you've configured the OAuth consent screen
- Check that you've added the correct scopes

### "This app isn't verified" warning
- This is normal during development
- Click "Advanced" > "Go to Band Merch POS (unsafe)" to continue
- For production, you'll need to verify your app with Google

## Next Steps

Once authentication is working:
- The app will automatically create Google Sheets for your products and sales
- All data syncs to your personal Google Drive
- You can access the app offline, syncing when you're back online

## Production Deployment (Vercel)

When deploying to Vercel:
1. Add production redirect URI to Google Cloud Console
2. Add environment variables in Vercel dashboard
3. Update `NEXTAUTH_URL` to your production URL
