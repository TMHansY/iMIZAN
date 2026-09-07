# iMIZAN — Setup Guide

Follow these steps in order. You will **not** need to edit any code — just install a few things, create two free accounts, and fill in config files.

---

## 1. Install prerequisites (macOS)

Open **Terminal** and run each of these one at a time:

```bash
# Install Homebrew (skip if you already have it)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and Git
brew install node git
```

Check they installed correctly:
```bash
node -v
npm -v
git -v
```
Each should print a version number.

---

## 2. Get the project files

You should have received the project as a folder or a git repository link. If it's a link:

```bash
cd ~
git clone https://github.com/TMHansY/iMIZAN
cd iMIZAN
```

If you were given a `.zip` folder instead, unzip it and `cd` into it in Terminal.

---

## 3. Create a free MongoDB Atlas database

This is where all exam data, users, and results are stored.

1. Go to **https://www.mongodb.com/cloud/atlas/register** and sign up (free).
2. When prompted to create a cluster, choose the **M0 Free** tier. Pick any region close to you.
3. Click **Create Deployment**.
4. Under **Security Quickstart**, create a database user:
   - Username: anything simple, e.g. `examapp`
   - Password: click **Autogenerate Secure Password** and **copy it somewhere safe** — you won't see it again.
5. Under **network access**, click **Add My Current IP Address**.
6. Click **Finish and Close**.
7. Go to **Database** in the left sidebar → click **Connect** on your cluster → choose **Drivers** → select **Node.js**.
8. Copy the connection string shown. It looks like:
   ```
   mongodb+srv://examapp:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
9. Replace `<password>` with your actual password from step 4, and add a database name before the `?`, like this:
   ```
   mongodb+srv://examapp:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/proctoai?retryWrites=true&w=majority
   ```
   **Keep this final string — you'll paste it into a config file in Step 5.**

   ⚠️ If your password contains special characters like `@ # % /`, they need to be "URL-encoded" (e.g. `@` becomes `%40`). Easiest fix: when generating the password in step 4, regenerate until you get one with only letters and numbers.

---

## 4. Create a free Uploadcare account (for cheating-detection screenshots)

This is where screenshots taken during exams (face not visible, phone detected, etc.) get stored.

1. Go to **https://uploadcare.com/** and sign up for a free account.
2. Create a new project when prompted.
3. In your project dashboard, find your **Public Key** — copy it.
4. Also find your **Delivery** settings/tab in the project dashboard — it will show your project's CDN subdomain, something like:
   ```
   5u5k52y8w7.ucarecd.net
   ```
   Copy this too. You'll need **both** the Public Key and this subdomain in the next step.

---

## 5. Fill in the config file

In the project folder, find the file named `.env.example` in the root folder. Make a copy of it named `.env`:

```bash
cp .env.example .env
```

Open `.env` in any text editor (TextEdit, VS Code, etc.) and fill in these values:

```
PORT=5050
NODE_ENV=development
MONGO_URL=<paste your full MongoDB connection string from Step 3 here>
JWT_SECRET=<type any random string of letters/numbers here, e.g. mySecretKey12345>
```

Save and close the file.

### Uploadcare key
The Uploadcare **public key** and **CDN subdomain** are already set inside the code (in `frontend/src/views/student/Components/WebCam.jsx`). If you were given your **own** fresh Uploadcare project (recommended, since the original one may stop working), ask whoever gave you this project to update these two values for you, or if you're comfortable, open that file and update:

```js
const client = new UploadClient({ 
  publicKey: 'YOUR_PUBLIC_KEY_HERE',
  baseCDN: 'https://YOUR_SUBDOMAIN_HERE.ucarecd.net',
});
```

replacing the key and subdomain with the ones you copied in Step 4. This is the only "code" you should ever need to touch — just replacing two text values, not writing new code.

---

## 6. Install the project's dependencies

Still in Terminal, in the project's root folder:

```bash
npm install
cd frontend
npm install
npm install @vladmandic/face-api
cd ..
```

This may take a few minutes and will show some warnings — that's normal, ignore them unless the command actually stops with an error.

---

## 7. Run the app

From the project's root folder:

```bash
npm run dev
```

Wait until you see something like:
```
server is running on http://localhost:5050
MongoDB Connected:
webpack compiled with 2 warnings
```

Your browser should automatically open to `http://localhost:3000`. If it doesn't, open it manually.

**Use Google Chrome**, not Safari — Safari blocks some cookies this app needs for login to work properly on localhost.

---

## 8. First-time use

1. Register a new account — choose **Lecturer** if you'll be creating exams, or **Student** if you'll be taking them.
2. Log in and explore — create an exam as a Lecturer, or join one as a Student.

---

## Troubleshooting

**"Port 5000 already in use" error when starting the server:**
This project is already configured to use port `5050` instead, so you shouldn't see this. If you do, check your `.env` file has `PORT=5050`.

**Login works but nothing else does (blank pages, errors after login):**
Make sure you're using Chrome, not Safari.

**`npm install` fails with a permissions error (`EACCES`):**
Run this once, then try `npm install` again:
```bash
sudo chown -R $(whoami) ~/.npm
```

**Screenshots don't show up in the cheating log:**
Double check the Uploadcare public key and subdomain in `WebCam.jsx` match your own Uploadcare project exactly, including the `https://` prefix on the subdomain.

**Something else breaks:**
Take a screenshot of the error (from the Terminal or the browser console — press F12 to open it) and send it to whoever gave you this project.
