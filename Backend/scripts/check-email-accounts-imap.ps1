# Test Email Account IMAP Settings
# This script helps diagnose and fix email accounts that can't fetch emails

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Email Account IMAP Settings Checker" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if Node is available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Navigate to Backend directory
$backendPath = Split-Path -Parent $PSScriptRoot
Set-Location $backendPath

Write-Host "`nChecking MongoDB connection..." -ForegroundColor Yellow

# Create a test script to check accounts
$testScript = @"
const mongoose = require('mongoose');
const EmailAccount = require('./models/EmailAccount');
require('dotenv').config();

async function checkAccounts() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const accounts = await EmailAccount.find({ accountType: 'noxtm-hosted' });
    console.log(\`Found \${accounts.length} hosted email accounts\n\`);

    let needsFix = 0;
    let isOk = 0;

    for (const account of accounts) {
      const hasSettings = account.imapSettings && account.imapSettings.encryptedPassword;
      
      if (hasSettings) {
        console.log(\`✅ \${account.email} - IMAP settings configured\`);
        isOk++;
      } else {
        console.log(\`❌ \${account.email} - Missing IMAP settings (needs password reset)\`);
        needsFix++;
      }
    }

    console.log(\`\n📊 Summary:\`);
    console.log(\`   ✅ Configured: \${isOk}\`);
    console.log(\`   ❌ Needs Fix: \${needsFix}\`);

    if (needsFix > 0) {
      console.log(\`\n💡 To fix these accounts:\`);
      console.log(\`   1. Use the password reset API endpoint:\`);
      console.log(\`      PUT /api/email-accounts/:id/reset-password\`);
      console.log(\`      Body: { "newPassword": "your-new-password" }\`);
      console.log(\`   2. Or run: node scripts/fix-email-account-settings.js\n\`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAccounts();
"@

# Save and run the test script
$testScript | Out-File -FilePath "temp-check-accounts.js" -Encoding UTF8

Write-Host "Running account check...`n" -ForegroundColor Yellow
node temp-check-accounts.js

# Clean up
Remove-Item "temp-check-accounts.js" -ErrorAction SilentlyContinue

Write-Host "`n========================================`n" -ForegroundColor Cyan
