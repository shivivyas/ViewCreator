# ViewCreator - Decoupled Architecture

This repository has been reorganized from a monolithic Next.js application into two distinct, decoupled projects:

1. **`viewcreator-ui`**: The frontend client-side Next.js 16.2.9 application containing the promotional landing pages and the AI Studio (image generation UI).
2. **`viewcreator-api`**: The backend image generation service powered by Express, TypeScript, and the Google Gemini API (`gemini-3.1-flash-image`).

---

## 🚀 How to Run the Projects

### 1. Backend API (`viewcreator-api`)
The backend handles the connection with Google Gemini and processes image generation requests.

1. Navigate to the API folder:
   ```bash
   cd viewcreator-api
   ```
2. Create and configure your `.env` file (copying `.env.example`):
   ```bash
   cp .env.example .env
   ```
3. Set your Google Gemini API key:
   ```env
   GEMINI_NANO_BANANA_API_KEY=your_actual_api_key_here
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:3001`.

---

### 2. Frontend UI (`viewcreator-ui`)
The frontend contains the landing pages and interactive image generator dashboard.

1. Navigate to the UI folder:
   ```bash
   cd viewcreator-ui
   ```
2. Configure your environment variables if needed (defaults to calling local API at `http://localhost:3001`):
   ```bash
   cp .env.example .env.local
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Communication and Configuration

- The UI is configured to call the API server via the `NEXT_PUBLIC_API_URL` environment variable.
- In production, deploy `viewcreator-api` as a server/container (e.g., Google Cloud Run, Railway, Heroku) and deploy `viewcreator-ui` to Vercel/Netlify.
- Update `NEXT_PUBLIC_API_URL` on the UI deployment to point to your deployed backend.
