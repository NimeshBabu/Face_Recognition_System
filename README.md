# Pahichan

Pahichan is an AI-powered missing person reporting and face matching platform. It lets citizens report missing people, police stations manage assigned cases, and admins manage users, police stations, and case records.

The project is split into three services:

- `frontend` - React + TypeScript + Vite web app.
- `backend-api` - Node.js + Express API with Firebase Firestore.
- `ai-service` - Python + Flask face recognition service using InsightFace/ArcFace.

## What The App Does

Pahichan supports three roles.

### Citizen/User

- Register and log in.
- Report a missing person with a progressive form.
- Upload a recent photo.
- Select the police station responsible for the case.
- View submitted missing-person reports.
- Open full case details.

### Police

- Log in as a police station.
- View cases assigned to that station.
- Open full case details.
- Upload a found-person photo.
- Run AI face matching against active missing-person embeddings.
- Confirm or reject possible matches.

### Admin

- Run first-time admin setup.
- Log in to the admin dashboard.
- View all missing-person cases.
- View all users.
- View all police stations.
- Create police station accounts.
- Delete invalid case records.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Axios

### Backend API

- Node.js
- Express
- Firebase Admin SDK
- Firestore
- JWT authentication
- Multer image uploads
- Bcrypt password hashing

### AI Service

- Python
- Flask
- InsightFace
- ONNX Runtime
- OpenCV
- NumPy

## Project Structure

```text
Pahichan/
  frontend/
    src/
      components/
      lib/
      pages/
    package.json
    vite.config.ts

  backend-api/
    controllers/
    middleware/
    routes/
    services/
    config/
    server.js
    package.json

  ai-service/
    app/
      routes/
      services/
    run.py
    requirements.txt
```

## How The Services Work Together

1. The frontend calls the Express backend.
2. The backend authenticates users with JWTs.
3. Missing-person case data is stored in Firestore.
4. Uploaded images are stored locally under `backend-api/uploads`.
5. The backend sends uploaded images to the AI service.
6. The AI service generates face embeddings using InsightFace.
7. Embeddings are stored in Firestore with the missing-person case.
8. Police can upload a found-person photo.
9. The backend asks the AI service to compare that photo against stored embeddings.
10. Police confirm or reject returned match candidates.

## Local Development

Run the services in this order:

1. AI service
2. Backend API
3. Frontend

### 1. Start The AI Service

```bash
cd ai-service
python -m venv .venv
```

On Windows:

```bash
.venv\Scripts\activate
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the AI service:

```bash
python run.py
```

Default AI service URL:

```text
http://localhost:5001
```

The AI service loads the `buffalo_l` InsightFace model on startup. If the model is missing, InsightFace downloads it into:

```text
ai-service/app/models
```

### 2. Start The Backend API

```bash
cd backend-api
npm install
```

Create a `.env` file:

```env
PORT=5000
JWT_SECRET=replace_with_a_secure_secret
ADMIN_SETUP_KEY=replace_with_a_private_setup_key
AI_SERVICE_URL=http://localhost:5001
```

Firebase credentials are currently loaded from:

```text
backend-api/config/serviceAccountKey.json
```

That file must exist locally for Firestore to work. Do not commit it to GitHub.

Start the backend:

```bash
npm start
```

Default backend URL:

```text
http://localhost:5000
```

Health check:

```text
GET http://localhost:5000/health
```

### 3. Start The Frontend

```bash
cd frontend
npm install
```

Optional frontend `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_API_PREFIX=
```

Start Vite:

```bash
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

## App Routes

Frontend routes:

```text
/                  Home page
/user/auth          User login/register
/police/auth        Police login
/admin/auth         Admin login/setup
/user/dashboard     User dashboard
/police/dashboard   Police dashboard
/admin/dashboard    Admin dashboard
```

## API Overview

### User API

Base path:

```text
/user
```

Routes:

```text
POST /register
POST /login
POST /report-missing
GET  /my-cases
GET  /case/:caseId
GET  /police-stations
```

### Police API

Base path:

```text
/police
```

Routes:

```text
POST /login
GET  /cases
GET  /case/:caseId
```

### Admin API

Base path:

```text
/admin
```

Routes:

```text
POST   /setup-admin
POST   /login
GET    /all-cases
GET    /users
GET    /police
POST   /create-police
DELETE /case/:caseId
```

### Match API

Base path:

```text
/match
```

Routes:

```text
POST /match-found
POST /confirm-match
POST /reject-match
```

## Firestore Collections

The backend uses these main Firestore collections:

```text
users
police_stations
missing_cases
found_reports
match_logs
```

### `users`

Stores citizen and admin accounts.

Common fields:

```text
name
email
password_hash
role
created_at
```

### `police_stations`

Stores police station login accounts.

Common fields:

```text
station_name
email
password_hash
location
role
created_at
```

### `missing_cases`

Stores missing-person reports.

Main sections:

```text
basic_info
physical_details
clothing_details
family_details
complainant_details
case_details
ai_data
system_data
```

### `found_reports`

Stores found-person upload records created by police matching.

### `match_logs`

Stores AI match attempts and police decisions.

Common statuses:

```text
pending
confirmed
rejected
```

## Image Handling

Images are currently saved locally by the backend:

```text
backend-api/uploads/missing_persons
backend-api/uploads/found_persons
```

The backend serves those files from:

```text
/uploads
```

Upload rules:

- Allowed file types: JPG, JPEG, PNG
- Max file size: 5 MB

Important deployment note: local uploads are not durable on many free hosting platforms. If the server restarts, redeploys, or runs on an ephemeral filesystem, old uploaded images can disappear.

For production, use persistent image storage such as Cloudinary, S3, Firebase Storage, or another object storage provider. Store the public image URL in Firestore instead of storing only a local file path.

## Face Recognition Flow

### Missing Person Report

1. User submits a missing-person form and photo.
2. Backend saves the image locally.
3. Backend sends the image to the AI service.
4. AI service detects a face and returns an embedding vector.
5. Backend stores the case and embedding in Firestore.

### Found Person Match

1. Police uploads a found-person photo.
2. Backend sends the image to the AI service.
3. AI service generates an embedding.
4. Backend compares it against stored missing-person embeddings.
5. Top matches above the configured threshold are returned.
6. Police confirms or rejects the match.

Current matching settings:

```text
THRESHOLD = 0.6
TOP_K = 3
```

## Authentication And Authorization

The backend uses JWT-based auth.

- Users can only access their own reports.
- Police can only access cases assigned to their station.
- Admins can access global admin routes.

The frontend stores the auth session in local storage under:

```text
frs_auth_session
```

## Admin Setup

Admin setup is protected by the `ADMIN_SETUP_KEY` environment variable.

Endpoint:

```text
POST /admin/setup-admin
```

Required header:

```text
x-setup-key: your_setup_key
```

Required body:

```json
{
  "email": "admin@example.com",
  "password": "secure-password"
}
```

You can also use the admin auth page in the frontend and choose first-time setup.

## Useful Commands

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run lint
```

### Backend

```bash
cd backend-api
npm start
```

### AI Service

```bash
cd ai-service
python run.py
```


## Known Limitations

- Uploaded images are stored on local disk, not persistent object storage.
- The AI service runs on CPU, so matching can be slow on free hosting.
- The first AI service startup can take time because the face model loads on boot.
- There is no backend endpoint yet for profile/password updates from dashboards.
- Match history is stored in Firestore, but the frontend currently focuses on the latest match run in the police dashboard.

## Security Notes

This project handles sensitive missing-person data and face images. Before using it in a real public setting:

- Move image storage to a secure persistent provider.
- Restrict CORS to trusted frontend domains.
- Use strong JWT secrets.
- Keep Firebase service account credentials out of GitHub.
- Add audit logging for admin and police actions.
- Add stricter validation and rate limiting.
- Review privacy, consent, and local legal requirements for face recognition.

## Summary

Pahichan is a full-stack missing-person reporting platform with role-based dashboards and AI face matching. Citizens report missing people, police process assigned cases and found-person matches, and admins manage the system. The app is ready for local development and demo deployment, with persistent image storage and production hardening recommended before real-world use.
