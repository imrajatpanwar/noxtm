const Papa = require('papaparse');

/**
 * Parse CSV file buffer and extract contact information
 * @param {Buffer} buffer - CSV file buffer
 * @returns {Promise<Array>} - Array of contact objects
 */
async function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    try {
      const csvString = buffer.toString('utf-8');

      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          // Normalize header names
          return header.trim().toLowerCase();
        },
        complete: (results) => {
          try {
            const contacts = [];
            const errors = [];

            results.data.forEach((row, index) => {
              // Try to find email field (support multiple column names)
              const email = row.email || row['e-mail'] || row['email address'] || row.mail || row.emailaddress;

              if (!email || !isValidEmail(email)) {
                errors.push(`Row ${index + 1}: Invalid or missing email`);
                return;
              }

              const contact = {
                email: email.trim().toLowerCase(),
                name: row.name || row.fullname || row['full name'] || row.contactname || row['contact name'] || '',
                companyName: row.company || row.companyname || row['company name'] || row.organization || '',
                phone: row.phone || row.phonenumber || row['phone number'] || row.mobile || row.tel || '',
                designation: row.designation || row.title || row.position || row.role || row.jobtitle || '',
                location: row.location || row.city || row.address || row.country || '',
                sourceType: 'csv'
              };

              // Add custom variables for personalization
              contact.variables = new Map();
              if (contact.name) contact.variables.set('name', contact.name);
              if (contact.companyName) contact.variables.set('companyName', contact.companyName);
              if (contact.designation) contact.variables.set('designation', contact.designation);

              // Add any additional fields as custom variables
              Object.keys(row).forEach(key => {
                const normalizedKey = key.trim();
                const standardFields = ['email', 'e-mail', 'email address', 'mail', 'emailaddress',
                  'name', 'fullname', 'full name', 'contactname', 'contact name',
                  'company', 'companyname', 'company name', 'organization',
                  'phone', 'phonenumber', 'phone number', 'mobile', 'tel',
                  'designation', 'title', 'position', 'role', 'jobtitle',
                  'location', 'city', 'address', 'country'];

                if (!standardFields.includes(key.toLowerCase()) && row[key]) {
                  contact.variables.set(normalizedKey, row[key].toString().trim());
                }
              });

              contacts.push(contact);
            });

            if (contacts.length === 0 && errors.length > 0) {
              reject(new Error(`No valid contacts found. Errors: ${errors.join(', ')}`));
            } else {
              resolve(contacts);
            }
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Convert contacts array to CSV format
 * @param {Array} contacts - Array of contact objects
 * @returns {string} - CSV string
 */
function contactsToCSV(contacts) {
  if (!contacts || contacts.length === 0) {
    return '';
  }

  const fields = ['email', 'name', 'companyName', 'phone', 'designation', 'location'];
  const csv = Papa.unparse(contacts, {
    columns: fields,
    header: true
  });

  return csv;
}

module.exports = {
  parseCSV,
  isValidEmail,
  contactsToCSV
};
