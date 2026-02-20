# UnderTheWx

Hyper-local garden weather dashboard and planting calendar for Spanish Fork, UT.

Aggregates data from 4 weather stations, normalizes to home elevation (4,623 ft ASL), and provides planting recommendations based on actual weather + frost dates.

## Data Sources

| Station | Type | Elevation |
|---------|------|-----------|
| Tempest 189439 (KUTLINDO34) | REST API | ~4,600 ft |
| WU KUTLINDO32 | REST API | ~4,600 ft |
| USU FGNET #16 | HTML scrape | 4,745 ft |
| USU FGNET #1302734 | HTML scrape | 5,475 ft |

## Quick Start (Local Dev)

### Prerequisites

```bash
# Azure Functions Core Tools v4
brew tap azure/functions && brew install azure-functions-core-tools@4

# Azurite (local Azure Storage emulator)
npm install -g azurite
```

### One-time setup

```bash
# 1. Clone and enter directory
cd underthewx

# 2. Copy environment templates
cp .env.example .env
cp local.settings.json.example api/local.settings.json

# 3. Fill in API keys in both files:
#    .env → for scripts
#    api/local.settings.json → for Azure Functions

# 4. Install dependencies
cd api && npm install && cd ..
cd frontend && npm install && cd ..
cd scripts && npm install && cd ..

# 5. Import planting data from xlsx files (run once)
cd scripts && npx ts-node import-planting-data.ts && cd ..

# 6. Create Azure Table Storage tables
cd scripts && npx ts-node seed-table-storage.ts && cd ..

# 7. Verify all 4 station connections
cd scripts && npx ts-node verify-stations.ts && cd ..
```

### Daily dev

```bash
# Terminal 1: Local storage emulator
azurite --location ~/.azurite --debug ~/.azurite/debug.log

# Terminal 2: Azure Functions (port 7071)
cd api && func start

# Terminal 3: React dev server (port 5173, proxies /api to 7071)
cd frontend && npm run dev
```

Open http://localhost:5173

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/weather/aggregated` | Latest normalized reading for home location |
| `GET /api/weather/history?resolution=10min\|hourly\|daily&hours=N` | Historical data for charts |
| `GET /api/planting/calendar?date=YYYY-MM-DD` | Planting windows for all crops |
| `GET /api/planting/zone` | USDA hardiness zone info |
| `POST /api/planting/zone/refresh` | Update zone (function key required) |

## Azure Deployment

```bash
# 1. Create resources
az group create --name underthewx-rg --location westus
az storage account create --name underthewxstorage --resource-group underthewx-rg --sku Standard_LRS
az keyvault create --name underthewx-kv --resource-group underthewx-rg --location westus

# 2. Store secrets
az keyvault secret set --vault-name underthewx-kv --name TempestApiToken --value "YOUR_TOKEN"
az keyvault secret set --vault-name underthewx-kv --name WuApiKey --value "YOUR_KEY"

# 3. Create Static Web App (links to GitHub for CI/CD)
az staticwebapp create \
  --name underthewx \
  --resource-group underthewx-rg \
  --location westus2 \
  --sku Free \
  --source https://github.com/YOUR_USERNAME/underthewx \
  --branch main \
  --app-location /frontend \
  --api-location /api \
  --output-location dist

# 4. Assign managed identity + Key Vault access
az staticwebapp identity assign --name underthewx --resource-group underthewx-rg
PRINCIPAL_ID=$(az staticwebapp show --name underthewx --resource-group underthewx-rg --query identity.principalId -o tsv)
az keyvault set-policy --name underthewx-kv --object-id $PRINCIPAL_ID --secret-permissions get list

# 5. Configure App Settings
az staticwebapp appsettings set \
  --name underthewx \
  --resource-group underthewx-rg \
  --setting-names \
    "KEY_VAULT_URI=https://underthewx-kv.vault.azure.net/" \
    "TEMPEST_STATION_ID=189439" \
    "WU_STATION_ID=KUTLINDO32" \
    "HOME_ELEVATION_FT=4623" \
    "HOME_FROST_DATE_SPRING=04-25" \
    "HOME_FROST_DATE_FALL=10-05"
```

## Annual USDA Zone Check (Feb 20)

```bash
# Check the USDA Plant Hardiness Zone map:
# https://planthardiness.ars.usda.gov/
# For: 40.33307°N, 111.72761°W

# If zone has changed, update via:
curl -X POST https://underthewx.azurestaticapps.net/api/planting/zone/refresh \
  -H "x-functions-key: YOUR_FUNCTION_KEY" \
  -H "Content-Type: application/json" \
  -d '{"zone": "6b-7a", "verifiedDate": "2026-02-20"}'
```

## Project Structure

```
underthewx/
├── frontend/          React 18 + Vite + TailwindCSS + Recharts
├── api/               Azure Functions v4 (Node.js/TypeScript)
├── scripts/           Data import and setup utilities
├── data_src/          Source xlsx planting data files
└── staticwebapp.config.json
```

## Elevation Normalization

Temperature is adjusted using standard atmospheric lapse rate (3.5°F per 1,000 ft). Pressure uses the barometric formula. Station weights: Tempest 40%, WU 30%, USU-16 25%, USU-1302734 5%.

## Frost Alert Levels

| Level | Temperature |
|-------|-------------|
| None | > 42°F |
| Low | 38-42°F or dewpoint approaching 32°F |
| Moderate | 34-38°F or radiative frost conditions |
| High | 28-34°F |
| Imminent | <= 28°F or at/below freezing |
