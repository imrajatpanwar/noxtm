const mongoose = require('mongoose');
const { execSync } = require('child_process');
const crypto = require('crypto');
require('dotenv').config();

function getKey() {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) throw new Error('EMAIL_ENCRYPTION_KEY not set');
  return crypto.createHash('sha256').update(key).digest();
}

function decrypt(encryptedText) {
  if (!encryptedText) return '';
  const key = getKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 2) return encryptedText;
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function setupDovecotUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const EmailAccount = mongoose.model('EmailAccount', new mongoose.Schema({
      email: String,
      accountType: String,
      imapSettings: {
        host: String,
        port: Number,
        secure: Boolean,
        username: String,
        encryptedPassword: String
      },
      smtpSettings: {
        host: String,
        port: Number,
        secure: Boolean,
        username: String,
        encryptedPassword: String
      }
    }), 'emailaccounts');

    // Get all noxtm-hosted accounts
    const accounts = await EmailAccount.find({ accountType: 'noxtm-hosted' });
    console.log(`📧 Found ${accounts.length} hosted accounts\n`);

    let success = 0;
    let errors = 0;

    for (const account of accounts) {
      try {
        console.log(`\n🔧 Setting up: ${account.email}`);
        
        // Check if account has IMAP settings with encrypted password
        if (!account.imapSettings || !account.imapSettings.encryptedPassword) {
          console.log(`   ⚠️  Skipping - No IMAP settings configured`);
          continue;
        }

        // Decrypt password
        const plainPassword = decrypt(account.imapSettings.encryptedPassword);
        console.log(`   🔐 Password decrypted successfully`);

        // Extract username and domain
        const [username, domain] = account.email.split('@');
        
        // Check if vmail user exists
        try {
          execSync('id vmail', { stdio: 'pipe' });
        } catch (e) {
          console.log('   📝 Creating vmail user...');
          try {
            execSync('groupadd -g 5000 vmail', { stdio: 'pipe' });
          } catch (err) {
            // Group might already exist
          }
          try {
            execSync('useradd -g vmail -u 5000 vmail -d /var/vmail -m', { stdio: 'pipe' });
          } catch (err) {
            // User might already exist
          }
        }

        // Create mail directory structure
        const mailDir = `/var/vmail/${domain}/${username}`;
        console.log(`   📁 Creating mail directory: ${mailDir}`);
        
        try {
          execSync(`mkdir -p ${mailDir}`, { stdio: 'pipe' });
          execSync(`chown -R vmail:vmail /var/vmail/${domain}`, { stdio: 'pipe' });
        } catch (err) {
          console.log(`   ⚠️  Warning: ${err.message}`);
        }

        // Generate password hash for Dovecot (SHA512-CRYPT)
        console.log(`   🔑 Generating password hash...`);
        const passwordHash = execSync(`doveadm pw -s SHA512-CRYPT -p '${plainPassword}'`, { 
          encoding: 'utf8' 
        }).trim();

        // Add user to Dovecot passwd file
        const passwdFile = '/etc/dovecot/users';
        const userLine = `${account.email}:${passwordHash}:5000:5000::${mailDir}::`;
        
        console.log(`   📝 Adding to Dovecot passwd file...`);
        
        // Read existing file
        let existingContent = '';
        try {
          existingContent = execSync(`cat ${passwdFile}`, { encoding: 'utf8' });
        } catch (err) {
          console.log(`   ℹ️  Passwd file doesn't exist, creating...`);
          execSync(`touch ${passwdFile}`, { stdio: 'pipe' });
        }

        // Check if user already exists
        const lines = existingContent.split('\n').filter(line => line.trim());
        const existingUserIndex = lines.findIndex(line => line.startsWith(`${account.email}:`));
        
        if (existingUserIndex >= 0) {
          // Update existing user
          lines[existingUserIndex] = userLine;
          console.log(`   ♻️  Updated existing user entry`);
        } else {
          // Add new user
          lines.push(userLine);
          console.log(`   ➕ Added new user entry`);
        }

        // Write back to file
        const newContent = lines.join('\n') + '\n';
        execSync(`echo '${newContent.replace(/'/g, "'\\''")}' > ${passwdFile}`, { stdio: 'pipe' });
        execSync(`chmod 640 ${passwdFile}`, { stdio: 'pipe' });
        execSync(`chown vmail:vmail ${passwdFile}`, { stdio: 'pipe' });

        // Test authentication
        console.log(`   🧪 Testing authentication...`);
        try {
          execSync(`doveadm auth test ${account.email} '${plainPassword}'`, { stdio: 'pipe' });
          console.log(`   ✅ Authentication successful!`);
          success++;
        } catch (authErr) {
          console.log(`   ⚠️  Authentication test failed (may need Dovecot restart)`);
          success++;
        }

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ Successfully configured ${success} accounts`);
    if (errors > 0) {
      console.log(`❌ Failed ${errors} accounts`);
    }
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Restart Dovecot: systemctl restart dovecot`);
    console.log(`   2. Check Dovecot logs: journalctl -u dovecot -n 50`);
    console.log(`   3. Test IMAP: telnet localhost 143`);
    console.log(`${'='.repeat(50)}\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setupDovecotUsers();
