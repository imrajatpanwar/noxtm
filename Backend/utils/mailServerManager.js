const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Create a new email account on the mail server using local commands
 * @param {string} email - Full email address (e.g., contact@noxtm.com)
 * @param {string} password - Plain text password for the email account
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function createMailboxOnServer(email, password) {
  try {
    console.log(`📬 Creating mailbox for ${email} using doveadm...`);
    
    // Use doveadm to create the user (this works on the local server)
    // First, add the user to the virtual users file if it exists
    const command = `doveadm user ${email} 2>/dev/null || echo "${email}:$(doveadm pw -s SHA512-CRYPT -p '${password}'):::::::" >> /etc/dovecot/users && doveadm reload`;
    
    const { stdout, stderr } = await execPromise(command);
    
    console.log(`✅ Mailbox created successfully for ${email}`);
    if (stdout) console.log(`stdout: ${stdout}`);
    if (stderr) console.log(`stderr: ${stderr}`);
    
    return {
      success: true,
      message: `Mailbox created successfully for ${email}`
    };
  } catch (error) {
    console.error(`❌ Failed to create mailbox for ${email}:`, error.message);
    throw new Error(`Failed to create mailbox: ${error.message}`);
  }
}

/**
 * Delete an email account from the mail server using local commands
 * @param {string} email - Full email address
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function deleteMailboxOnServer(email) {
  try {
    console.log(`🗑️ Deleting mailbox for ${email}...`);
    
    // Remove the user from the virtual users file
    const command = `sed -i '/^${email}:/d' /etc/dovecot/users && doveadm reload`;
    
    const { stdout, stderr } = await execPromise(command);
    
    console.log(`✅ Mailbox deleted successfully for ${email}`);
    if (stdout) console.log(`stdout: ${stdout}`);
    if (stderr) console.log(`stderr: ${stderr}`);
    
    return {
      success: true,
      message: `Mailbox deleted successfully for ${email}`
    };
  } catch (error) {
    console.error(`❌ Failed to delete mailbox for ${email}:`, error.message);
    throw new Error(`Failed to delete mailbox: ${error.message}`);
  }
}

module.exports = {
  createMailboxOnServer,
  deleteMailboxOnServer
};
