# Deployment Guide

## Prerequisites
- Azure CLI installed: `az --version`
- Azure account: `az login`

## Step 1: Deploy Backend to Azure App Service

```powershell
# Navigate to project root
cd C:\Git\tg-react-app

# Deploy API (replace with your names)
az webapp up `
  --name tg-react-api `
  --resource-group tg-react-rg `
  --runtime "DOTNET:9.0" `
  --location eastus `
  --src-path ./publish
```

## Step 2: Configure Azure App Service

```powershell
# Set environment variables (more secure than appsettings.json)
az webapp config appsettings set `
  --name tg-react-api `
  --resource-group tg-react-rg `
  --settings `
    Auth__SigningKey="YOUR_SECURE_256_BIT_KEY" `
    SpecialistRegistrationCode="SPECIALIST2024" `
    AllowedOrigins__0="https://YOUR_FRONTEND.azurestaticapps.net"
```

## Step 3: Create Azure SQL Database

```powershell
# Create SQL Server
az sql server create `
  --name tg-sql-server `
  --resource-group tg-react-rg `
  --location eastus `
  --admin-user sqladmin `
  --admin-password "SecureP@ssw0rd123!"

# Create Database
az sql db create `
  --resource-group tg-react-rg `
  --server tg-sql-server `
  --name GlowBookDb `
  --service-objective Basic

# Allow Azure services to access
az sql server firewall-rule create `
  --resource-group tg-react-rg `
  --server tg-sql-server `
  --name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0

# Set connection string in App Service
az webapp config connection-string set `
  --name tg-react-api `
  --resource-group tg-react-rg `
  --connection-string-type SQLAzure `
  --settings DefaultConnection="Server=tg-sql-server.database.windows.net;Database=GlowBookDb;User ID=sqladmin;Password=SecureP@ssw0rd123!;Encrypt=True;TrustServerCertificate=False"
```

## Step 4: Deploy Frontend to Azure Static Web Apps

```powershell
cd src/Web/tg-react-app.web

# Deploy to Static Web Apps
az staticwebapp create `
  --name tg-react-frontend `
  --resource-group tg-react-rg `
  --location eastus `
  --source dist/ `
  --app-location "/" `
  --output-location "dist" `
  --branch main
```

Or manually upload `dist/` folder via Azure Portal.

## Step 5: Update Frontend API URL

Before building frontend, update the API URL:

**Option A: Environment variable**
Create `.env.production` in `src/Web/tg-react-app.web/`:
```
VITE_API_BASE_URL=https://tg-react-api.azurewebsites.net
```

**Option B: Update vite.config.js**
```javascript
define: {
  'import.meta.env.VITE_API_BASE_URL': JSON.stringify('https://tg-react-api.azurewebsites.net')
}
```

Then rebuild: `npm run build` and redeploy.

## Step 6: Enable CORS on Backend

Update `AllowedOrigins` in Azure App Service configuration to include your frontend URL.

## Testing

1. Backend: https://tg-react-api.azurewebsites.net/api/health
2. Frontend: https://tg-react-frontend.azurestaticapps.net

## Troubleshooting

- View logs: `az webapp log tail --name tg-react-api --resource-group tg-react-rg`
- Check app settings: `az webapp config appsettings list --name tg-react-api --resource-group tg-react-rg`
- Restart app: `az webapp restart --name tg-react-api --resource-group tg-react-rg`
