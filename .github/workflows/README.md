# GitHub Actions Workflows

This directory contains CI/CD workflows for the TgReactApp application.

## Workflows

### 1. Build and Test (`build-and-test.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual trigger via workflow_dispatch

**What it does:**
- ✅ Builds the .NET 9 backend API
- ✅ Builds the React frontend with Vite
- ✅ Runs tests (if available)
- ✅ Runs linter on frontend code
- ✅ Creates build artifacts (retained for 7 days)
- ✅ Reports build status

**Artifacts Created:**
- `api-build` - Built and published .NET API
- `frontend-build` - Built React application (dist folder)

### 2. Deploy (`deploy.yml`)

**Triggers:**
- Manual trigger via workflow_dispatch (with environment selection)
- When a GitHub release is published

**What it does:**
- 🚀 Builds both backend and frontend for production
- 📦 Creates deployment packages (zip files)
- 📤 Uploads deployment artifacts (retained for 30 days)
- 🔧 Ready for you to add deployment steps for your hosting provider

**Artifacts Created:**
- `deployment-package-{environment}` - Contains both API and frontend zip files

**Supported Environments:**
- Staging
- Production

## How to Use

### Running CI Builds

Simply push to `main` or `develop` branches, or create a pull request. The build workflow will run automatically.

### Deploying the Application

1. Go to the **Actions** tab in GitHub
2. Select the **Deploy Application** workflow
3. Click **Run workflow**
4. Choose the target environment (staging or production)
5. Click **Run workflow** button

### Adding Deployment Steps

To automatically deploy to your hosting provider, edit `.github/workflows/deploy.yml` and add deployment steps at the end. Examples:

#### Deploy to Azure App Service
```yaml
- name: Deploy Backend to Azure
  uses: azure/webapps-deploy@v2
  with:
    app-name: 'your-app-name'
    publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
    package: ${{github.workspace}}/deploy-api.zip
```

#### Deploy to AWS
```yaml
- name: Deploy to AWS
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1
```

#### Deploy via FTP
```yaml
- name: Deploy via FTP
  uses: SamKirkland/FTP-Deploy-Action@v4.3.4
  with:
    server: ${{ secrets.FTP_SERVER }}
    username: ${{ secrets.FTP_USERNAME }}
    password: ${{ secrets.FTP_PASSWORD }}
    local-dir: ${{github.workspace}}/publish/
```

## Secrets Required

Depending on your deployment target, you may need to add these secrets in GitHub Settings → Secrets and variables → Actions:

- `AZURE_WEBAPP_PUBLISH_PROFILE` - For Azure deployments
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - For AWS deployments
- `FTP_SERVER` / `FTP_USERNAME` / `FTP_PASSWORD` - For FTP deployments
- Any other secrets required by your hosting provider

## Status Badges

Add these to your main README.md to show build status:

```markdown
[![Build and Test](https://github.com/YOUR_USERNAME/tg.react.app/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/YOUR_USERNAME/tg.react.app/actions/workflows/build-and-test.yml)
```

## Notes

- The backend requires Windows runner due to LocalDB during development
- Frontend can build on any runner (Ubuntu is faster and cheaper)
- Build artifacts are automatically cleaned up after retention period
- Workflows use Node 20 and .NET 9
- Frontend uses `npm ci` for faster, reproducible builds

