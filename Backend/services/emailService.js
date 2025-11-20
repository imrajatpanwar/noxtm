const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configure email transporter
    // Use your existing email service configuration or AWS SES
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendQuoteNotification(client, quote) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: client.email,
        subject: `Quote for ${client.companyName}`,
        html: this.generateQuoteEmailTemplate(client, quote)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Quote email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending quote email:', error);
      throw error;
    }
  }

  async sendInvoiceNotification(invoice) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: invoice.email,
        subject: `Invoice ${invoice.invoiceNumber} from ${process.env.COMPANY_NAME || 'Your Company'}`,
        html: this.generateInvoiceEmailTemplate(invoice)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Invoice email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending invoice email:', error);
      throw error;
    }
  }

  async sendInvoiceReminder(invoice) {
    try {
      const daysUntilDue = Math.ceil((new Date(invoice.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: invoice.email,
        subject: `Reminder: Invoice ${invoice.invoiceNumber} Due in ${daysUntilDue} Days`,
        html: this.generateReminderEmailTemplate(invoice, daysUntilDue)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Invoice reminder sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending reminder email:', error);
      throw error;
    }
  }

  generateQuoteEmailTemplate(client, quote) {
    const itemsHtml = quote.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toLocaleString()}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">New Quote</h1>
        </div>
        
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Dear ${client.clientName},</p>
          
          <p>Thank you for your interest in our services. Please find your quote details below:</p>
          
          <div style="margin: 30px 0;">
            <h3 style="color: #111827; margin-bottom: 15px;">Quote for ${client.companyName}</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Subtotal:</span>
                <strong>$${quote.subtotal.toLocaleString()}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Tax:</span>
                <strong>$${quote.tax.toLocaleString()}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #e5e7eb; font-size: 18px;">
                <strong>Total:</strong>
                <strong style="color: #10b981;">$${quote.total.toLocaleString()}</strong>
              </div>
            </div>
          </div>
          
          <p>This quote is valid for 30 days. If you have any questions, please don't hesitate to contact us.</p>
          
          <p style="margin-top: 30px;">Best regards,<br><strong>${process.env.COMPANY_NAME || 'Your Company'}</strong></p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
          <p>This is an automated email. Please do not reply directly to this message.</p>
        </div>
      </body>
      </html>
    `;
  }

  generateInvoiceEmailTemplate(invoice) {
    const itemsHtml = invoice.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Invoice ${invoice.invoiceNumber}</h1>
        </div>
        
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Dear ${invoice.clientName},</p>
          
          <p>Thank you for your business. Please find your invoice attached below:</p>
          
          <div style="margin: 30px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
              <div>
                <p style="margin: 5px 0;"><strong>Invoice Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
                <p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 5px 0;"><strong>Bill To:</strong></p>
                <p style="margin: 5px 0;">${invoice.companyName}</p>
              </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Subtotal:</span>
                <strong>$${invoice.subtotal.toFixed(2)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Tax:</span>
                <strong>$${invoice.tax.toFixed(2)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #e5e7eb; font-size: 18px;">
                <strong>Total Amount Due:</strong>
                <strong style="color: #10b981;">$${invoice.total.toFixed(2)}</strong>
              </div>
            </div>
          </div>
          
          ${invoice.notes ? `<div style="margin: 20px 0; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;"><strong>Notes:</strong><p style="margin: 5px 0 0 0;">${invoice.notes}</p></div>` : ''}
          
          <p style="margin-top: 30px;">Please make payment by the due date. If you have any questions regarding this invoice, please contact us.</p>
          
          <p style="margin-top: 30px;">Best regards,<br><strong>${process.env.COMPANY_NAME || 'Your Company'}</strong></p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
          <p>This is an automated email. Please do not reply directly to this message.</p>
        </div>
      </body>
      </html>
    `;
  }

  generateReminderEmailTemplate(invoice, daysUntilDue) {
    const urgencyColor = daysUntilDue <= 3 ? '#ef4444' : '#f59e0b';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${urgencyColor}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Payment Reminder</h1>
        </div>
        
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Dear ${invoice.clientName},</p>
          
          <p>This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong> is due in <strong>${daysUntilDue} days</strong>.</p>
          
          <div style="margin: 30px 0; padding: 20px; background: #fef3c7; border-left: 4px solid ${urgencyColor}; border-radius: 4px;">
            <p style="margin: 0; font-size: 18px;"><strong>Amount Due: $${invoice.total.toFixed(2)}</strong></p>
            <p style="margin: 10px 0 0 0;">Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
          
          <p>Please ensure payment is made by the due date to avoid any late fees or service interruptions.</p>
          
          <p>If you have already made the payment, please disregard this email and accept our thanks.</p>
          
          <p style="margin-top: 30px;">Best regards,<br><strong>${process.env.COMPANY_NAME || 'Your Company'}</strong></p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
          <p>This is an automated email. Please do not reply directly to this message.</p>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
