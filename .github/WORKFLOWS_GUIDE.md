# 🚀 GitHub Actions CI/CD Guide for TgReactApp

## Overview

Your application now has a complete CI/CD pipeline configured with 3 GitHub Actions workflows:

```
.github/workflows/
├── build-and-test.yml    # Main CI pipeline
├── deploy.yml            # Deployment pipeline
└── pr-validation.yml     # Pull Request checks
```

## 📋 Workflow Summary

### 1. 🔨 Build and Test (Continuous Integration)

**File:** `build-and-test.yml`

**Runs on:**
- Every push to `main` or `develop`
- Every pull request to `main` or `develop`
- Manual trigger

**What happens:**
```
┌─────────────────────────────────────────┐
│  Backend Job (Windows)                  │
│  ├─ Setup .NET 9                        │
│  ├─ Restore dependencies                │
│  ├─ Build Release configuration         │
│  ├─ Run tests                           │
│  └─ Publish & upload artifacts          │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Frontend Job (Ubuntu)                  │
│  ├─ Setup Node.js 20                    │
│  ├─ Install dependencies (npm ci)       │
│  ├─ Run ESLint                          │
│  ├─ Build with Vite                     │
│  └─ Upload artifacts                    │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Build Status                           │
│  └─ Report overall success/failure      │
└─────────────────────────────────────────┘
```

**Artifacts:** `api-build`, `frontend-build` (7 days retention)

---

### 2. 🚀 Deploy (Continuous Deployment)

**File:** `deploy.yml`

**Runs on:**
- Manual trigger (choose staging or production)
- When a release is published

**What happens:**
```
┌─────────────────────────────────────────┐
│  Build Backend + Frontend               │
│  ├─ Build .NET API                      │
│  ├─ Build React Frontend                │
│  └─ Create ZIP packages                 │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Upload Deployment Package              │
│  ├─ deploy-api.zip                      │
│  └─ deploy-frontend.zip                 │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  🔧 YOUR DEPLOYMENT STEPS HERE          │
│  (Azure/AWS/IIS/Docker/etc)             │
└─────────────────────────────────────────┘
```

**Artifacts:** `deployment-package-{env}` (30 days retention)

---

### 3. ✅ PR Validation

**File:** `pr-validation.yml`

**Runs on:**
- Pull requests opened/updated

**What happens:**
```
┌─────────────────────────────────────────┐
│  PR Validation                          │
│  ├─ Check PR title format               │
│  └─ Check for merge conflicts           │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Backend Code Quality                   │
│  ├─ Build                               │
│  ├─ Run tests                           │
│  └─ Code analysis                       │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Frontend Code Quality                  │
│  ├─ ESLint check                        │
│  ├─ Check for console.log               │
│  ├─ Build                               │
│  └─ Bundle size analysis                │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Security & Dependencies                │
│  ├─ Vulnerability scan (npm audit)      │
│  └─ Check outdated packages             │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Post Summary Comment on PR             │
│  └─ Table with all check results        │
└─────────────────────────────────────────┘
```

---

## 🎯 Quick Start Guide

### First Time Setup

1. **Push these workflows to GitHub:**
   ```bash
   git add .github/workflows/
   git commit -m "Add GitHub Actions CI/CD workflows"
   git push origin main
   ```

2. **Check the Actions tab:**
   - Go to: https://github.com/YOUR_USERNAME/tg.react.app/actions
   - You should see the workflows listed

### Running a Build

**Automatic:**
- Just push code or create a PR - builds run automatically!

**Manual:**
- Go to Actions → Build and Test → Run workflow

### Deploying

1. Go to Actions → Deploy Application
2. Click "Run workflow"
3. Select environment (staging/production)
4. Click "Run workflow" button
5. Download artifacts or add auto-deploy steps

---

## 🔧 Customization

### Add Deployment Steps

Edit `.github/workflows/deploy.yml` and add your deployment provider:

**Example: Azure Web App**
```yaml
- name: Deploy to Azure
  uses: azure/webapps-deploy@v2
  with:
    app-name: 'your-app-name'
    publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
    package: deploy-api.zip
```

**Example: AWS Elastic Beanstalk**
```yaml
- name: Deploy to AWS
  uses: einaregilsson/beanstalk-deploy@v21
  with:
    aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    application_name: tg-react-app
    environment_name: production
    version_label: ${{ github.sha }}
    region: us-east-1
    deployment_package: deploy-api.zip
```

### Add Secrets

Settings → Secrets and variables → Actions → New repository secret

Common secrets needed:
- `AZURE_WEBAPP_PUBLISH_PROFILE`
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- `FTP_HOST` / `FTP_USERNAME` / `FTP_PASSWORD`

---

## 📊 Status Badges

Add to your README.md:

```markdown
[![Build and Test](https://github.com/YOUR_USERNAME/tg.react.app/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/YOUR_USERNAME/tg.react.app/actions/workflows/build-and-test.yml)

[![Deploy](https://github.com/YOUR_USERNAME/tg.react.app/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/tg.react.app/actions/workflows/deploy.yml)
```

---

## 🛠️ Troubleshooting

**Build fails on backend:**
- Check .NET version (needs 9.0.x)
- Verify all NuGet packages are available
- Check for missing dependencies

**Build fails on frontend:**
- Check Node version (needs 20.x)
- Run `npm ci` locally to verify package-lock.json
- Check for ESLint errors

**Deployment package not created:**
- Check if both backend and frontend builds succeeded
- Verify artifact upload permissions
- Check workflow logs for zip creation errors

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [.NET CI/CD](https://docs.microsoft.com/en-us/dotnet/devops/github-actions-overview)
- [Node.js CI/CD](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs)
- [Azure Deployment](https://docs.microsoft.com/en-us/azure/app-service/deploy-github-actions)

---

## ✨ What You Get

✅ Automated builds on every commit  
✅ Pull request validation with quality checks  
✅ Deployment packages ready to use  
✅ Security vulnerability scanning  
✅ Bundle size monitoring  
✅ Code quality checks (linting)  
✅ Test execution (when tests exist)  
✅ Build artifacts for easy download  
✅ PR summary comments  
✅ Multi-environment support  

---

**Need help?** Check the [Workflows README](.github/workflows/README.md) for more details!

