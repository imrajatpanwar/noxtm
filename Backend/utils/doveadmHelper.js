const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Check if doveadm is available (production server)
let isDoveadmAvailable = null;

/**
 * Check if doveadm command is available
 * @returns {Promise<boolean>}
 */
async function checkDoveadmAvailable() {
  if (isDoveadmAvailable !== null) {
    return isDoveadmAvailable;
  }
  
  try {
    await execAsync('doveadm help');
    isDoveadmAvailable = true;
    console.log('✅ Doveadm is available');
  } catch (error) {
    isDoveadmAvailable = false;
    console.log('⚠️ Doveadm not available - mail server features will be limited (local dev mode)');
  }
  
  return isDoveadmAvailable;
}

/**
 * Execute a doveadm command
 * @param {string} command - The doveadm command to execute
 * @returns {Promise<string>} - Command output
 */
async function executeDoveadmCommand(command) {
  const available = await checkDoveadmAvailable();
  if (!available) {
    throw new Error('Doveadm not available (local development mode)');
  }
  
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('Warning')) {
      console.warn('Doveadm stderr:', stderr);
    }
    return stdout;
  } catch (error) {
    console.error('Doveadm command error:', error);
    throw new Error(`Doveadm command failed: ${error.message}`);
  }
}

/**
 * Create a new email account using doveadm
 * @param {string} email - Email address
 * @param {string} password - Plain text password
 * @param {number} quotaMB - Quota in megabytes
 * @returns {Promise<boolean>} - Success status
 */
async function createMailbox(email, password, quotaMB = 1024) {
  try {
    const username = email;
    
    // Check if user already exists
    const checkCmd = `grep -c "^${username}:" /etc/dovecot/users || echo "0"`;
    const { stdout: checkResult } = await execAsync(checkCmd);
    
    if (parseInt(checkResult.trim()) > 0) {
      throw new Error('User already exists in Dovecot');
    }
    
    // Generate password hash using doveadm
    const hashCmd = `doveadm pw -s SHA512-CRYPT -p '${password}'`;
    const { stdout: passwordHash } = await execAsync(hashCmd);
    const hash = passwordHash.trim();
    
    // Get next available UID (find highest current UID and add 1)
    const getUidCmd = `awk -F: '{print $3}' /etc/dovecot/users | sort -n | tail -1`;
    const { stdout: maxUid } = await execAsync(getUidCmd);
    const nextUid = (parseInt(maxUid.trim()) || 5000) + 1;
    
    // Create home directory
    const homeDir = `/home/${username.split('@')[0]}`;
    await execAsync(`mkdir -p ${homeDir}`);
    await execAsync(`chown ${nextUid}:${nextUid} ${homeDir}`);
    
    // Add user to dovecot users file
    // Format: username:password:uid:gid::homedir::
    const userLine = `${username}:${hash}:${nextUid}:${nextUid}::${homeDir}::`;
    await execAsync(`echo '${userLine}' >> /etc/dovecot/users`);
    
    // Set permissions on users file
    await execAsync(`chown root:dovecot /etc/dovecot/users`);
    await execAsync(`chmod 640 /etc/dovecot/users`);
    
    // Create initial mailbox folders using doveadm
    const createFoldersCmd = `doveadm mailbox create -u ${username} INBOX Sent Drafts Trash Spam 2>&1 || true`;
    await execAsync(createFoldersCmd);
    
    // Set quota for the user
    const quotaBytes = quotaMB * 1024 * 1024;
    const setQuotaCmd = `doveadm quota set -u ${username} storage ${quotaBytes} 2>&1 || true`;
    await execAsync(setQuotaCmd);
    
    console.log(`✅ Mailbox created for ${email} with quota ${quotaMB}MB (UID: ${nextUid})`);
    return true;
  } catch (error) {
    console.error('Error creating mailbox:', error);
    throw new Error(`Failed to create mailbox: ${error.message}`);
  }
}

/**
 * Get quota usage for an email account
 * @param {string} email - Email address
 * @returns {Promise<{used: number, limit: number, percentage: number}>} - Quota info in MB
 */
async function getQuota(email) {
  try {
    // Check if doveadm is available (don't spam logs)
    const available = await checkDoveadmAvailable();
    if (!available) {
      // Return default quota for local dev
      return { used: 0, limit: 1024, percentage: 0 };
    }
    
    const cmd = `doveadm quota get -u ${email}`;
    const output = await executeDoveadmCommand(cmd);
    
    // Parse doveadm quota output
    // Format: Quota name Type Value Limit %
    const lines = output.trim().split('\n');
    
    if (lines.length < 2) {
      return { used: 0, limit: 0, percentage: 0 };
    }
    
    // Skip header line, parse data line
    const dataLine = lines[1].trim().split(/\s+/);
    
    if (dataLine.length >= 4) {
      const usedBytes = parseInt(dataLine[2]) || 0;
      const limitBytes = parseInt(dataLine[3]) || 0;
      
      const usedMB = Math.round(usedBytes / (1024 * 1024));
      const limitMB = Math.round(limitBytes / (1024 * 1024));
      const percentage = limitMB > 0 ? Math.round((usedMB / limitMB) * 100) : 0;
      
      return {
        used: usedMB,
        limit: limitMB,
        percentage: percentage
      };
    }
    
    return { used: 0, limit: 0, percentage: 0 };
  } catch (error) {
    // Only log if it's not the "not available" error
    if (!error.message.includes('not available')) {
      console.error('Error getting quota:', error);
    }
    // Return default values instead of throwing
    return { used: 0, limit: 1024, percentage: 0 };
  }
}

/**
 * Update quota limit for an email account
 * @param {string} email - Email address
 * @param {number} quotaMB - New quota in megabytes
 * @returns {Promise<boolean>} - Success status
 */
async function updateQuota(email, quotaMB) {
  try {
    const quotaBytes = quotaMB * 1024 * 1024;
    const cmd = `doveadm quota set -u ${email} storage ${quotaBytes}`;
    await execAsync(cmd);
    
    console.log(`✅ Quota updated for ${email}: ${quotaMB}MB`);
    return true;
  } catch (error) {
    console.error('Error updating quota:', error);
    throw new Error(`Failed to update quota: ${error.message}`);
  }
}

/**
 * Delete a mailbox using doveadm
 * @param {string} email - Email address
 * @returns {Promise<boolean>} - Success status
 */
async function deleteMailbox(email) {
  try {
    // Delete all mailboxes for user
    const cmd = `doveadm mailbox delete -u ${email} -r '*'`;
    await execAsync(cmd);
    
    // Remove user from dovecot users file
    const removeUserCmd = `sed -i '/^${email}:/d' /etc/dovecot/users`;
    await execAsync(removeUserCmd);
    
    console.log(`✅ Mailbox deleted for ${email}`);
    return true;
  } catch (error) {
    console.error('Error deleting mailbox:', error);
    throw new Error(`Failed to delete mailbox: ${error.message}`);
  }
}

/**
 * Change password for an email account
 * @param {string} email - Email address
 * @param {string} newPassword - New plain text password
 * @returns {Promise<boolean>} - Success status
 */
async function changePassword(email, newPassword) {
  try {
    // Generate password hash
    const { stdout } = await execAsync(`doveadm pw -s SHA512-CRYPT -p '${newPassword}'`);
    const hashedPassword = stdout.trim();
    
    // Update password in users file
    const updateCmd = `sed -i 's|^${email}:.*|${email}:${hashedPassword}|' /etc/dovecot/users`;
    await execAsync(updateCmd);
    
    console.log(`✅ Password changed for ${email}`);
    return true;
  } catch (error) {
    console.error('Error changing password:', error);
    throw new Error(`Failed to change password: ${error.message}`);
  }
}

/**
 * Test if doveadm is available
 * @returns {Promise<boolean>} - True if doveadm is available
 */
async function isDoveadmAvailable() {
  try {
    await execAsync('which doveadm');
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  createMailbox,
  getQuota,
  updateQuota,
  deleteMailbox,
  changePassword,
  isDoveadmAvailable,
  executeDoveadmCommand
};
