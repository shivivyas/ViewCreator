# ViewCreator Database Module (`viewcreator-database`)

This is a decoupled, lightweight PostgreSQL database module for the ViewCreator application. It provides simple, strongly typed, and performant connection management and repositories for `User` and `Template` entities using standard Node-Postgres (`pg`).

---

## 🏗️ Entities

### 1. Users (`users` table)
Tracks user records.
- `id` (UUID): Unique user identifier.
- `email` (string): User email (unique).
- `name` (string): User's name (nullable).
- `created_at` / `updated_at` (timestamps).

### 2. Templates (`templates` table)
Viral social media templates ready to be processed with Gemini and prompts.
- `id` (UUID): Unique template identifier.
- `title` (string): Title of the template.
- `description` (string): Description of the social media style.
- `s3_link` (string): AWS S3 URL pointing to the template image file.
- `config` (JSONB): Highly flexible JSON configuration storing overlay dimensions, bounding boxes, text positions, or default instructions.
- `created_at` / `updated_at` (timestamps).

---

## 🛠️ Getting Started

### 1. Install Dependencies
Before running scripts or compiling, install the package dependencies:
```bash
npm install
```

### 2. Environment Variables Configuration
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
And adjust your local PostgreSQL settings:
```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=viewcreator
```

### 3. Run Migrations
To initialize the database, create the schema, tables, and update triggers, run:
```bash
npm run db:migrate
```

### 4. Build the Module
To compile the TypeScript code to JavaScript (which exports types and `.d.ts` declaration maps for use in other packages like `viewcreator-api`):
```bash
npm run build
```

---

## 🔌 How to Integrate into `viewcreator-api`

### 1. Link or Install Local Dependency
In `viewcreator-api/package.json`, add this folder as a file-based dependency:
```json
"dependencies": {
  ...
  "viewcreator-database": "file:../viewcreator-database"
}
```
Then run `npm install` inside `viewcreator-api` to create a symlink to this local compiled package.

### 2. Configure Environment variables in `viewcreator-api`
Make sure to copy the database credentials from `viewcreator-database/.env` into `viewcreator-api/.env` as the connection module uses process environment variables.

### 3. Example Usage in API Code (`viewcreator-api/src/index.ts`)
```typescript
import { UserRepository, TemplateRepository } from 'viewcreator-database';

// Fetch user
const user = await UserRepository.findByEmail('hello@example.com');

// Fetch templates
const templates = await TemplateRepository.findAll();

// Use metadata s3_link in Gemini generation workflow
const templateId = req.body.templateId;
const template = await TemplateRepository.findById(templateId);
if (template) {
  const imageUrl = template.s3_link; // Fetched from AWS S3 in backend context
  // Use imageUrl as a reference for Gemini API
}
```
