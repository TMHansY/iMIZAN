# iMIZAN

An online examination platform for managing courses, assessments, and results. iMIZAN provides separate workspaces for administrators, lecturers, and students, with browser-based proctoring and lecturer review of exam attempts.

The interface supports responsive layouts and a persistent light/dark theme.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [First-time setup](#first-time-setup)
- [Development commands](#development-commands)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

| Workspace | Capabilities |
| --- | --- |
| Administrator | Approve accounts, manage users and courses, assign lecturers, and view platform statistics. |
| Lecturer | Create and edit exams, manage questions and enrollment requests, review results and proctoring logs, and set pass/fail decisions. |
| Student | Apply to courses, take available exams, view released results, and review answers when permitted. |

- **Configurable assessments:** multiple-choice questions, question images, time limits, availability windows, attempt limits, optional back navigation, and question/option randomization.
- **Proctoring support:** camera readiness checks, face and person detection, phone detection, tab inactivity tracking, and screenshot logs.
- **Result review:** automatic scoring, lecturer overrides, and controls for releasing results to students.
- **Account access:** email or ID-number login, administrator approval, and role-specific navigation.
- **Appearance:** light and dark modes, a visible theme toggle, and a locally saved preference.

Proctoring flags provide context for lecturer review; they do not establish misconduct on their own.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, Material UI, React Router, Redux Toolkit / RTK Query |
| Forms | Formik, Yup |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Authentication | JWT cookies, bcrypt |
| Proctoring | TensorFlow.js, COCO-SSD, face-api, react-webcam |
| Image storage | Uploadcare |
| Email notifications | Resend |
| Frontend tooling | Create React App, Jest, React Testing Library |

## Getting started

### Prerequisites

- Node.js and npm installed locally. The repository does not currently pin a Node.js version.
- Git, or a downloaded copy of the repository.
- A MongoDB database, either local or hosted on MongoDB Atlas.
- An Uploadcare project for question images and proctoring screenshots.
- A webcam and browser camera permission to use the proctored exam workflow.

### 1. Clone and install

```bash
git clone https://github.com/TMHansY/iMIZAN.git
cd iMIZAN
npm install
npm install --prefix frontend
```

Both the root and frontend dependencies are required. The face-detection packages are already included in the frontend dependencies.

### 2. Configure the application

Copy the root environment template:

```bash
cp .env.example .env
```

Alternatively, duplicate `.env.example` in your file manager and rename the copy to `.env`.

Set the values in the new file:

```dotenv
PORT=5050
NODE_ENV=development
MONGO_URL=mongodb://127.0.0.1:27017/imizan
JWT_SECRET=replace_with_a_randomly_generated_secret
```

Use your Atlas connection string instead of the local MongoDB URL if applicable. Include a database name, configure database credentials and network access, and URL-encode special characters in the username or password.

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the output into `JWT_SECRET`. Keep `.env` out of version control.

Configure Uploadcare as described in [Configuration](#configuration) before using image uploads.

### 3. Start development servers

```bash
npm run dev
```

| Service | Local address |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5050 |

The frontend development server proxies API requests to port `5050`. If you change the backend port, also update the `proxy` value in [frontend/package.json](frontend/package.json).

## Configuration

### Backend environment variables

Set these in the root `.env` file:

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port; defaults to `5050` when unset. |
| `NODE_ENV` | Use `development` locally or `production` to serve the frontend build through Express. |
| `MONGO_URL` | MongoDB connection string. Required. |
| `JWT_SECRET` | Secret used to sign authentication tokens. Required. |
| `RESEND_API_KEY` | Resend API key for approval/rejection emails. Needed only when configuring email delivery. |

### Frontend API address

`REACT_APP_BACKEND_URL` sets the backend origin for frontend API requests. For the local proxy setup, leave it unset. For a separately hosted backend, set it in `frontend/.env` or the frontend build environment:

```dotenv
REACT_APP_BACKEND_URL=https://your-api.example.com
```

Restart the frontend development server or rebuild after changing this value. Frontend environment variables are included in the browser bundle; do not place private credentials there.

### Uploadcare

Image uploads use [frontend/src/utils/uploadcareClient.js](frontend/src/utils/uploadcareClient.js). Set its `publicKey` and `baseCDN` to your own project's values:

```js
export const uploadcareClient = new UploadClient({
  publicKey: 'YOUR_PUBLIC_KEY',
  baseCDN: 'https://YOUR_PROJECT_CDN_DOMAIN',
});
```

This client is shared by question-image uploads and proctoring screenshots. The public key is intended for browser use; private Uploadcare credentials do not belong in this file.

### Email notifications

To enable account approval/rejection emails:

1. Add `RESEND_API_KEY` to the root `.env` file.
2. Replace the placeholder `from: "-"` in [backend/utils/sendEmail.js](backend/utils/sendEmail.js) with an authorized sender address for your Resend setup.

The sender is currently configured in code, not through an environment variable. The helper is designed to keep approval/rejection actions working when email delivery fails.

## First-time setup

New registrations require administrator approval before login. The registration screen offers student and lecturer roles; there is no administrator bootstrap script.

For a new database that you administer:

1. Register your own account through the application.
2. In MongoDB Compass, Atlas, or `mongosh`, locate that account in the `users` collection of the application's database.
3. Set `role` to `admin`, `isApproved` to `true`, and `hasBeenApproved` to `true`.
4. Sign in with that account to manage subsequent registrations.

For example, after selecting the correct application database in `mongosh`:

```js
db.users.updateOne(
  { email: 'your-admin@example.com' },
  { $set: { role: 'admin', isApproved: true, hasBeenApproved: true } }
);
```

Replace the email with the account you registered. Its password should remain the hash created by the application.

A typical workflow is:

1. An administrator approves lecturer/student accounts and creates a course assigned to a lecturer.
2. A student applies to join the course; the lecturer reviews the application.
3. The lecturer creates an exam and adds its questions.
4. The enrolled student completes the camera check and takes the exam within its availability window.
5. The lecturer reviews results and proctoring logs, makes any required decision, and releases results.

## Development commands

Run these from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the backend and frontend together. |
| `npm run server` | Start the backend with Nodemon. |
| `npm run client` | Start the frontend development server. |
| `npm start` | Start the backend without automatic reload. |
| `npm run build --prefix frontend` | Build the frontend into `frontend/build`. |
| `npm run build` | Install frontend dependencies, then build the frontend. |
| `npm test --prefix frontend -- --watchAll=false` | Run frontend tests once. |

The root `npm test` command is a placeholder and exits with an error. Use the frontend test command above. The current theme tests cover preference persistence, toggle behavior, and dark-mode contrast; they are not a full end-to-end test suite.

## Project structure

```text
backend/
  config/          Database connection
  controllers/     Request handlers and business logic
  middleware/      Authentication and error handling
  models/          Mongoose schemas
  routes/          API routes
  utils/           Tokens, email, and ownership helpers
  server.js        Express entry point
frontend/
  public/models/   Face-detection model assets
  src/
    components/    Shared UI components
    context/       Theme and proctoring state
    layouts/       Navigation and page layouts
    slices/        Redux state and API definitions
    theme/         Colours, typography, and component styles
    utils/         Shared clients and utilities
    views/         Authentication and role-specific screens
.env.example       Backend configuration template
```

## Deployment

For an Express-hosted frontend:

1. Install root and frontend dependencies.
2. Run `npm run build --prefix frontend`.
3. Set `NODE_ENV=production` and the required backend environment variables.
4. Run `npm start` from the repository root.

Express serves `frontend/build` in production. For a separate frontend deployment, set `REACT_APP_BACKEND_URL` before building and update the allowed origins in [backend/server.js](backend/server.js).

Authentication uses HTTP-only cookies configured with `Secure` and `SameSite=None`. Use HTTPS for deployed environments and verify credentialed requests and cookie handling for your chosen frontend/backend origins. Camera access also requires a browser-supported secure context.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Backend fails to connect to MongoDB | Check `MONGO_URL`, database credentials, and Atlas network access or the local MongoDB service. |
| Login reports pending approval | Have an administrator approve the account. For a fresh database, follow [First-time setup](#first-time-setup). |
| Login succeeds but protected requests fail | Inspect the browser's cookie warnings and network requests. Verify API origin, allowed CORS origins, and whether the JWT cookie is stored and sent. |
| Backend port is already in use | Stop the conflicting service or update `PORT` and the frontend proxy together. |
| Camera check fails | Allow camera access, close other applications using the webcam, and check browser permissions and the page's secure context. |
| Images fail to upload or load | Verify the Uploadcare public key and CDN domain in the shared upload client; inspect failed upload requests. |
| Proctoring models fail to load | Check requests to `/models` and external model resources. Ensure the model files in `frontend/public/models` are included in the frontend deployment. |
| Approval emails are not delivered | Check the Resend API key, sender configuration, and backend logs. |
| Theme changes do not persist | Browser storage may be blocked or cleared. The toggle still works for the current session. |

When reporting an issue, include the relevant screen, steps to reproduce, expected and actual behavior, and sanitized browser/server errors. Remove credentials and student data from logs or screenshots before sharing them.

## Contributing

Open an issue to discuss substantial changes. For pull requests, describe the problem, the change, and how it was checked. Include screenshots for UI changes where helpful, and check both themes and mobile layouts.

Run the frontend tests and production build before submitting. Keep unrelated changes separate and do not commit secrets or generated build files.

## License

The root `package.json` declares `ISC`. A standalone license file is not currently included in the repository.
