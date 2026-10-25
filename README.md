# ResumeHub

A personal resume organizer: email/password login, private PDF storage, job-role categorization, search/filter, signed PDF links, and delete.

## Requirements
- Node.js 20.9+ (Node 22 LTS recommended)
- A Supabase account
- A Vercel account for online deployment

## 1. Create the Supabase project
1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor**, create a query, paste all of `supabase/schema.sql`, and run it.
3. In **Project Settings → API** (or **Connect**), copy the Project URL and the publishable/anon public key. Never use a `service_role` or secret key in the browser.
4. Open **Authentication → URL Configuration**. Set the Site URL to your future Vercel URL once deployed. During local testing, add `http://localhost:3000` to Redirect URLs if needed.
5. For a personal tool, you can disable public sign-ups after creating your account in Authentication settings. If you do that, create your account first.

## 2. Run on Windows 11
Extract the ZIP, open the extracted `resumehub` folder in VS Code, then open Terminal → New Terminal.

```powershell
node -v
npm -v
Copy-Item .env.example .env.local
```

Edit `.env.local` and replace the placeholder values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Then run:
```powershell
npm install
npm run dev
```
Open http://localhost:3000. Create an account, confirm the email if confirmation is enabled, sign in, and upload a PDF.

## 3. Deploy online to Vercel
1. Create a GitHub repository and push this project to it.
2. Import that repository at https://vercel.com/new.
3. Add these Environment Variables in Vercel Project Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.
5. Copy the assigned HTTPS domain. In Supabase **Authentication → URL Configuration**, set **Site URL** to that domain and add it to Redirect URLs.
6. Redeploy if you changed environment variables.

## 4. Git commands
Run in the project folder:
```powershell
git init
git add .
git commit -m "Build ResumeHub"
```
Create an empty GitHub repository, then use the exact remote URL GitHub provides:
```powershell
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

## Security notes
- The `resumes` Storage bucket is private.
- Database Row Level Security limits records to the signed-in owner.
- Storage policies limit files to a folder named with the user's auth UUID.
- PDFs are opened with 60-second signed URLs.
- The app checks PDF extension/MIME and a 10 MB maximum in the browser; the bucket enforces size and MIME limits too. MIME/extension checks are not full malware scanning or cryptographic file-content verification.
- Do not place Supabase service-role keys in `.env.local` or any `NEXT_PUBLIC_` variable.
- This starter does not include password reset, multi-factor authentication, antivirus scanning, or account deletion workflows.
