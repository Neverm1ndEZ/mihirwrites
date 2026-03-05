# Mihir Writes — Personal Blog

A minimal, editorial blog with dark/light mode, rich media support, and a clean admin dashboard. Built with Next.js 16, MongoDB Atlas, and Cloudinary.

## Stack

| Layer | Tool | Free Tier |
|---|---|---|
| Frontend + API | Next.js 16 (App Router) | — |
| Database | MongoDB Atlas M0 | 512MB free forever |
| Media storage | Cloudinary | 25GB storage / 25GB bandwidth |
| Deployment | Vercel | Hobby plan free |

**Monthly cost: $0**

---

## Features

- ✦ Sleek editorial UI — Lora serif + DM Sans, warm amber accent
- ☀ Dark / Light mode (respects system preference)
- 📝 Markdown editor with live preview
- 🖼 Media uploads — images, videos, PDFs via Cloudinary
- 💬 Named comments (no anonymous posting)
- 🔒 Password-protected admin dashboard
- 📅 Date on every post
- 🏷 Tags
- 🚀 ISR — pages revalidate automatically
- 📱 Mobile responsive

---

## Setup

### 1. MongoDB Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free account → **Create a Cluster** → choose **M0 Free**
3. Create a database user (remember the password)
4. Under **Network Access** → Add IP `0.0.0.0/0` (allow all — needed for Vercel)
5. Under **Connect** → **Drivers** → copy the connection string
6. Replace `<password>` in the string with your DB user's password

### 2. Cloudinary

1. Go to [cloudinary.com](https://cloudinary.com) → create a free account
2. From the Dashboard, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 3. Local development

```bash
# Clone and install
npm install

# Copy env file
cp .env.example .env.local

# Fill in your values
nano .env.local
```

Your `.env.local` needs:
```
MONGODB_URI=mongodb+srv://...
ADMIN_PASSWORD=your-password
JWT_SECRET=any-random-32+-char-string
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
npm run dev
# → http://localhost:3000
```

### 4. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo at [vercel.com](https://vercel.com).

**Add all env vars** from `.env.local` in Vercel → Project → Settings → Environment Variables.

Change `NEXT_PUBLIC_SITE_URL` to your Vercel URL (e.g. `https://my-journal.vercel.app`).

---

## Usage

### Writing posts

1. Go to `/admin`
2. Enter your `ADMIN_PASSWORD`
3. Click **+ New Post**
4. Write in **Markdown** — the editor has a live preview
5. Upload media via the **↑ Upload Media** button
6. Set a cover image (upload or paste URL)
7. Add comma-separated tags
8. Click **Publish** or save as **Draft**

### Embedding media in posts

```markdown
# Image
![My photo](https://res.cloudinary.com/...)

# Video (mp4, webm, ogg, mov)
![My video](https://res.cloudinary.com/.../video.mp4)

# PDF
![My document](https://res.cloudinary.com/.../file.pdf)

# External link (if not embedding)
[Download PDF](https://example.com/file.pdf)
```

The renderer auto-detects the file type from the URL.

### Comments

Readers leave their **name + comment** on each post. Comments are stored in MongoDB. You can delete any comment from the API (`DELETE /api/posts/:slug/comments?id=...`).

---

## Project Structure

```
app/
  page.tsx              ← Blog home (post listing)
  post/[slug]/page.tsx  ← Individual post + comments
  admin/
    page.tsx            ← Admin login / dashboard
    new/page.tsx        ← Create post
    edit/[slug]/page.tsx ← Edit post
  api/
    posts/              ← CRUD for posts
    upload/             ← Cloudinary upload
    auth/               ← Login / logout
components/
  Navbar.tsx
  ThemeProvider.tsx
  MarkdownContent.tsx   ← Renders markdown + media
  CommentSection.tsx    ← Comment form + list
  PostEditor.tsx        ← Markdown editor + preview
  MediaUploader.tsx     ← Drag-and-drop upload
  AdminLogin.tsx
  AdminDashboard.tsx
lib/
  mongodb.ts            ← Connection with serverless caching
  auth.ts               ← JWT utils
  cloudinary.ts         ← Upload helper
models/
  Post.ts
  Comment.ts
```
