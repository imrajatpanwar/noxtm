const { Client } = require('ssh2');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Create a new email account on the mail server
 * @param {string} email - Full email address (e.g., contact@noxtm.com)
 * @param {string} password - Plain text password for the email account
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function createMailboxOnServer(email, password) {
  return new Promise((resolve, reject) => {
    const host = process.env.MAIL_SERVER_ADMIN_HOST || '185.137.122.61';
    const username = process.env.MAIL_SERVER_ADMIN_USER || 'root';
    const password_server = process.env.MAIL_SERVER_ADMIN_PASSWORD;

    if (!password_server) {
      return reject(new Error('Mail server admin credentials not configured'));
    }

    const conn = new Client();

    conn.on('ready', () => {
      console.log(`📡 SSH connection established to ${host}`);

      // Command to create the email user on the server
      // This assumes you have a script like update-dovecot-users.sh
      // Adjust the command based on your actual mail server setup
      const command = `/root/update-dovecot-users.sh add "${email}" "${password}"`;

      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(new Error(`Failed to execute command: ${err.message}`));
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code, signal) => {
          conn.end();
          
          if (code === 0) {
            console.log(`✅ Mailbox created successfully for ${email}`);
            resolve({
              success: true,
              message: `Mailbox created successfully for ${email}`
            });
          } else {
            console.error(`❌ Command failed with code ${code}`);
            console.error(`stderr: ${stderr}`);
            reject(new Error(`Failed to create mailbox: ${stderr || 'Unknown error'}`));
          }
        }).on('data', (data) => {
          stdout += data.toString();
          console.log(`stdout: ${data}`);
        }).stderr.on('data', (data) => {
          stderr += data.toString();
          console.error(`stderr: ${data}`);
        });
      });
    });

    conn.on('error', (err) => {
      console.error(`❌ SSH connection error: ${err.message}`);
      reject(new Error(`SSH connection failed: ${err.message}`));
    });

    // Connect to the server
    conn.connect({
      host: host,
      port: 22,
      username: username,
      password: password_server,
      readyTimeout: 10000
    });
  });
}

/**
 * Delete an email account from the mail server
 * @param {string} email - Full email address
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function deleteMailboxOnServer(email) {
  return new Promise((resolve, reject) => {
    const host = process.env.MAIL_SERVER_ADMIN_HOST || '185.137.122.61';
    const username = process.env.MAIL_SERVER_ADMIN_USER || 'root';
    const password_server = process.env.MAIL_SERVER_ADMIN_PASSWORD;

    if (!password_server) {
      return reject(new Error('Mail server admin credentials not configured'));
    }

    const conn = new Client();

    conn.on('ready', () => {
      console.log(`📡 SSH connection established to ${host}`);

      const command = `/root/update-dovecot-users.sh delete "${email}"`;

      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(new Error(`Failed to execute command: ${err.message}`));
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code, signal) => {
          conn.end();
          
          if (code === 0) {
            console.log(`✅ Mailbox deleted successfully for ${email}`);
            resolve({
              success: true,
              message: `Mailbox deleted successfully for ${email}`
            });
          } else {
            console.error(`❌ Command failed with code ${code}`);
            console.error(`stderr: ${stderr}`);
            reject(new Error(`Failed to delete mailbox: ${stderr || 'Unknown error'}`));
          }
        }).on('data', (data) => {
          stdout += data.toString();
          console.log(`stdout: ${data}`);
        }).stderr.on('data', (data) => {
          stderr += data.toString();
          console.error(`stderr: ${data}`);
        });
      });
    });

    conn.on('error', (err) => {
      console.error(`❌ SSH connection error: ${err.message}`);
      reject(new Error(`SSH connection failed: ${err.message}`));
    });

    conn.connect({
      host: host,
      port: 22,
      username: username,
      password: password_server,
      readyTimeout: 10000
    });
  });
}

module.exports = {
  createMailboxOnServer,
  deleteMailboxOnServer
};
