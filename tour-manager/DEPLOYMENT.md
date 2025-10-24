# 🚀 Deployment Guide

This guide will help you deploy your Band Merch POS to production.

## Option 1: Vercel (Recommended) ⭐

Vercel is the easiest option as it's made by the creators of Next.js.

### Steps:

1. **Push to GitHub**

   ```bash
   git init
   git add .
   git commit -m "Initial commit - Band Merch POS"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy to Vercel**

   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "Add New Project"
   - Select your repository
   - Click "Import"

3. **Add Environment Variables**

   - In the Vercel dashboard, go to your project
   - Click "Settings" → "Environment Variables"
   - Add:
     - `GOOGLE_SHEET_ID`: Your spreadsheet ID
     - `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS`: Your JSON credentials (as one line)

4. **Deploy!**

   - Click "Deploy"
   - Wait ~2 minutes
   - Your app is live! 🎉

5. **Custom Domain (Optional)**
   - In Vercel settings, go to "Domains"
   - Add your custom domain (e.g., `merch.yourbandname.com`)
   - Update DNS settings as instructed

### Auto-Deploy

Every time you push to GitHub, Vercel automatically redeploys. Nice! 🔄

---

## Option 2: Netlify

Another great option with similar ease of use.

### Steps:

1. **Build command**: `npm run build`
2. **Publish directory**: `.next`
3. **Add environment variables** in Netlify dashboard
4. **Enable serverless functions** (automatic)

---

## Option 3: Self-Hosted (VPS)

For those who want full control.

### Requirements:

- Ubuntu/Debian VPS
- Node.js 18+
- PM2 for process management
- Nginx for reverse proxy

### Steps:

1. **SSH into your server**

   ```bash
   ssh user@your-server.com
   ```

2. **Clone your repo**

   ```bash
   git clone YOUR_REPO_URL
   cd tour-manager
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Set environment variables**

   ```bash
   nano .env.local
   # Add your variables
   ```

5. **Build the app**

   ```bash
   npm run build
   ```

6. **Install PM2**

   ```bash
   npm install -g pm2
   pm2 start npm --name "merch-pos" -- start
   pm2 save
   pm2 startup
   ```

7. **Configure Nginx**

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Enable HTTPS with Let's Encrypt**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

---

## Option 4: Docker

### Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Build and Run:

```bash
docker build -t merch-pos .
docker run -p 3000:3000 -e GOOGLE_SHEET_ID=xxx -e GOOGLE_SERVICE_ACCOUNT_CREDENTIALS=xxx merch-pos
```

---

## Post-Deployment Checklist

After deploying, test these features:

- [ ] POS interface loads
- [ ] Default products appear
- [ ] Can add products in Setup tab
- [ ] Can complete a test sale
- [ ] Sales sync to Google Sheets
- [ ] Products sync to Google Sheets
- [ ] PWA manifest is accessible at `/manifest.json`
- [ ] App works offline (disable network in DevTools)
- [ ] App can be installed on iPad (Add to Home Screen)

---

## Production Tips

### Security

- ✅ HTTPS is REQUIRED for PWA features
- ✅ Never commit `.env.local` or service account JSON to git
- ✅ Use Vercel/Netlify environment variables for secrets

### Performance

- ✅ Next.js automatically optimizes images
- ✅ Service worker caches assets for offline use
- ✅ IndexedDB stores data locally for instant access

### Monitoring

- Use Vercel Analytics (free tier available)
- Check Google Sheets for sales data
- Monitor error logs in your deployment platform

### Backups

- Google Sheets acts as your backup
- Export sheet data regularly
- Keep local backups of service account JSON

---

## Updating the App

### With Vercel/Netlify:

```bash
git add .
git commit -m "Updated products"
git push
# Auto-deploys! 🚀
```

### With Self-Hosted:

```bash
git pull
npm install
npm run build
pm2 restart merch-pos
```

---

## Troubleshooting Deployment

### Build Fails

- Check Node.js version (needs 18+)
- Ensure all dependencies are in `package.json`
- Check build logs for specific errors

### Environment Variables Not Working

- Restart the deployment after adding variables
- Check variable names match exactly
- Ensure JSON credentials are on ONE line

### PWA Not Installing

- HTTPS must be enabled
- Check manifest.json is accessible
- Clear browser cache and try again

### Google Sheets Sync Fails in Production

- Verify environment variables are set
- Check service account has Editor access
- Test with the `/api/sync-sales` endpoint

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Issues: Open an issue on GitHub

Good luck with your tour! 🎸🚀
