const PDFDocument = require('pdfkit');

class PDFService {
  generateInvoicePDF(invoice, user) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header
        doc.fontSize(28)
           .font('Helvetica-Bold')
           .text('INVOICE', 50, 50);

        doc.fontSize(10)
           .font('Helvetica')
           .text(`Invoice #: ${invoice.invoiceNumber}`, 400, 50, { align: 'right' })
           .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 400, 65, { align: 'right' })
           .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 400, 80, { align: 'right' });

        // Company Info (Your Company)
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('From:', 50, 120);

        doc.fontSize(10)
           .font('Helvetica')
           .text(user.companyName || 'Your Company', 50, 140)
           .text(user.email || '', 50, 155)
           .text(user.phone || '', 50, 170);

        // Client Info (Bill To)
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Bill To:', 300, 120);

        doc.fontSize(10)
           .font('Helvetica')
           .text(invoice.clientName, 300, 140)
           .text(invoice.companyName, 300, 155)
           .text(invoice.email, 300, 170)
           .text(invoice.phone, 300, 185);

        // Line
        doc.moveTo(50, 220)
           .lineTo(550, 220)
           .stroke();

        // Table Header
        const tableTop = 240;
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('Description', 50, tableTop)
           .text('Qty', 320, tableTop, { width: 50, align: 'center' })
           .text('Price', 380, tableTop, { width: 80, align: 'right' })
           .text('Amount', 470, tableTop, { width: 80, align: 'right' });

        // Table Items
        let yPosition = tableTop + 25;
        doc.font('Helvetica');

        invoice.items.forEach((item, index) => {
          const amount = item.quantity * item.price;
          
          doc.text(item.description, 50, yPosition, { width: 250 })
             .text(item.quantity.toString(), 320, yPosition, { width: 50, align: 'center' })
             .text(`$${item.price.toFixed(2)}`, 380, yPosition, { width: 80, align: 'right' })
             .text(`$${amount.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });
          
          yPosition += 25;
        });

        // Line before totals
        yPosition += 10;
        doc.moveTo(50, yPosition)
           .lineTo(550, yPosition)
           .stroke();

        // Totals
        yPosition += 20;
        doc.fontSize(10)
           .font('Helvetica')
           .text('Subtotal:', 390, yPosition)
           .text(`$${invoice.subtotal.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });

        yPosition += 20;
        doc.text('Tax:', 390, yPosition)
           .text(`$${invoice.tax.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });

        yPosition += 20;
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Total:', 390, yPosition)
           .text(`$${invoice.total.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });

        // Status Badge
        yPosition += 30;
        const statusColors = {
          paid: '#10b981',
          pending: '#f59e0b',
          overdue: '#ef4444',
          cancelled: '#6b7280'
        };
        
        doc.fontSize(10)
           .fillColor(statusColors[invoice.status] || '#6b7280')
           .text(`Status: ${invoice.status.toUpperCase()}`, 50, yPosition);

        doc.fillColor('#000000'); // Reset color

        // Notes
        if (invoice.notes) {
          yPosition += 40;
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .text('Notes:', 50, yPosition);
          
          yPosition += 15;
          doc.font('Helvetica')
             .text(invoice.notes, 50, yPosition, { width: 500 });
        }

        // Footer
        const footerY = 700;
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#6b7280')
           .text('Thank you for your business!', 50, footerY, { align: 'center', width: 500 })
           .text(`Generated on ${new Date().toLocaleDateString()}`, 50, footerY + 15, { align: 'center', width: 500 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new PDFService();
