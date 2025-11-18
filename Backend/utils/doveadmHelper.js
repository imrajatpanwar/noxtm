const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Execute a doveadm command
 * @param {string} command - The doveadm command to execute
 * @returns {Promise<string>} - Command output
 */
async function executeDoveadmCommand(command) {
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
    
    // Create the user with doveadm
    const createUserCmd = `doveadm user ${username} || doveadm pw -s SHA512-CRYPT -p '${password}' | xargs -I {} echo '${username}:{}' >> /etc/dovecot/users`;
    await execAsync(createUserCmd);
    
    // Set quota for the user (convert MB to bytes)
    const quotaBytes = quotaMB * 1024 * 1024;
    const setQuotaCmd = `doveadm quota set -u ${username} storage ${quotaBytes}`;
    await execAsync(setQuotaCmd);
    
    // Create initial mailbox folders
    const createFoldersCmd = `doveadm mailbox create -u ${username} INBOX Sent Drafts Trash Spam`;
    await execAsync(createFoldersCmd);
    
    console.log(`✅ Mailbox created for ${email} with quota ${quotaMB}MB`);
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
    console.error('Error getting quota:', error);
    // Return default values instead of throwing
    return { used: 0, limit: 0, percentage: 0 };
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
