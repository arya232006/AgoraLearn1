# Deploying AgoraLearn to Google Cloud Platform (Cloud Run)

This guide assumes you have the **Google Cloud SDK** installed and initialized (`gcloud init`).

## 1. Enable Required Services
Run these commands essentially once to enable the container registry and Cloud Run.
```bash
gcloud services enable artifactregistry.googleapis.com run.googleapis.com
```

## 2. Deploy Backend (AgoraLearn)
Navigate to the backend folder:
```bash
cd AgoraLearn
```

Submit the build to Cloud Run (replace `[YOUR_PROJECT_ID]` with your real GCP Project ID, and `[REGION]` with e.g., `us-central1`):
```bash
gcloud run deploy agoralearn-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```
*Note: The CLI will ask to create an Artifact Registry repository if one doesn't exist. Say "y" (yes).*

**Setting Environment Variables:**
Your backend needs secrets (OPENAI_API_KEY, SUPABASE_URL, etc.). You can set them via the UI or CLI:
```bash
gcloud run services update agoralearn-backend \
  --set-env-vars="OPENAI_API_KEY=sk-...,SUPABASE_URL=..."
```

## 3. Deploy Frontend (AgoraLearn-UI)
Navigate to the frontend folder:
```bash
cd ../AgoraLearn-UI
```

**Important:** Content Security Policy / Environment Vars
If your frontend calls the backend, you must update the API URL.
Unlike standard React, Next.js 'Build Time' env vars (NEXT_PUBLIC_...) must be present **during the build**.

If you use `NEXT_PUBLIC_API_URL` to point to the backend, you have two choices:
1. **Hardcode** the prod backend URL in `lib/config.ts` (or wherever used) before deploying.
2. **Build Argument** (Advanced): Pass the URL during the build.

Deploy command:
```bash
gcloud run deploy agoralearn-ui \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

## 4. Method 2: Automatic Hosting via GitHub (CI/CD)

Instead of deploying from your local computer, you can connect your GitHub repository so GCP deploys automatically whenever you push code.

### Step 1: Push Code to GitHub
Ensure your latest code (including the `cloudbuild.yaml` files created) is on GitHub.

### Step 2: Setup Backend Trigger
1. Go to **Google Cloud Console** > **Cloud Build** > **Triggers**.
2. Click **Create Trigger**.
3. **Name**: `deploy-backend`.
4. **Source**: Select your GitHub repository.
5. **Event**: "Push to a branch" (e.g., `main`).
6. **Included files filter**: `AgoraLearn/**` (Only deploy when backend code changes).
7. **Configuration**: 
   - Type: **Cloud Build configuration file (yaml or json)**.
   - Location: `AgoraLearn/cloudbuild.yaml`.
8. Click **Create**.

### Step 3: Setup Frontend Trigger
1. Create another Trigger.
2. **Name**: `deploy-frontend`.
3. **Included files filter**: `AgoraLearn-UI/**`.
4. **Configuration**:
   - Location: `AgoraLearn-UI/cloudbuild.yaml`.
5. Click **Create**.

Now, whenever you `git push` changes, Google Cloud will read the `cloudbuild.yaml` file, build your Docker container, and update the deployed Cloud Run service automatically.

## 5. Updates
To redeploy, just run the `gcloud run deploy` command again in the respective folder.
