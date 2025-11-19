const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');

const sesClient = new SESv2Client({
  region: process.env.AWS_SDK_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_SDK_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SDK_SECRET_ACCESS_KEY
  }
});

async function sendEmailViaSES({ from, to, subject, html, text, replyTo, metadata }) {
  const params = {
    FromEmailAddress: from,
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to]
    },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: html ? { Data: html, Charset: 'UTF-8' } : undefined,
          Text: text ? { Data: text, Charset: 'UTF-8' } : undefined
        }
      }
    }
  };

  if (replyTo) {
    params.ReplyToAddresses = Array.isArray(replyTo) ? replyTo : [replyTo];
  }

  const command = new SendEmailCommand(params);
  
  try {
    const result = await sesClient.send(command);
    console.log(`✓ Email sent via AWS SES: ${result.MessageId}`);
    return result;
  } catch (error) {
    console.error(`✗ AWS SES send failed: ${error.message}`);
    throw error;
  }
}

module.exports = { sesClient, sendEmailViaSES };
