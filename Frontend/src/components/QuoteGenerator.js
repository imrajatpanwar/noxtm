import React, { useState } from 'react';
import { FiPlus, FiTrash2, FiCheck } from 'react-icons/fi';
import './QuoteGenerator.css';

const QuoteGenerator = ({ client, onQuoteGenerated, onCancel }) => {
  const [items, setItems] = useState([{ name: '', price: '' }]);

  const addItem = () => {
    setItems([...items, { name: '', price: '' }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index, field, value) => {
    const updatedItems = items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      return sum + price;
    }, 0);
  };

  const handleSendApproval = async () => {
    // Validate all items have name and price
    const invalidItems = items.filter(item => !item.name || !item.price);
    if (invalidItems.length > 0) {
      alert('Please fill in all item names and prices');
      return;
    }

    const quoteData = {
      items: items.map(item => ({
        name: item.name,
        price: parseFloat(item.price),
        quantity: 1
      }))
    };

    try {
      const token = localStorage.getItem('token');
      const clientId = client._id || client.id;
      
      const response = await fetch(`/api/clients/${clientId}/quote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quoteData)
      });

      if (!response.ok) {
        throw new Error('Failed to create quote');
      }

      const quote = await response.json();
      onQuoteGenerated(quote);
    } catch (error) {
      console.error('Error creating quote:', error);
      alert('Failed to create quote. Please try again.');
    }
  };

  const total = calculateTotal();

  return (
    <div className="qg-container">
      <div className="qg-header">
        <h4>Generate Quote</h4>
        <p>Create a quote for {client.companyName}</p>
      </div>

      <div className="qg-items">
        {items.map((item, index) => (
          <div key={index} className="qg-item-row">
            <div className="qg-item-number">{index + 1}</div>
            <div className="qg-item-inputs">
              <input
                type="text"
                placeholder="Item Name"
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
                className="qg-item-name"
              />
              <div className="qg-price-group">
                <span className="qg-currency">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={item.price}
                  onChange={(e) => updateItem(index, 'price', e.target.value)}
                  className="qg-item-price"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            {items.length > 1 && (
              <button
                type="button"
                className="qg-remove-btn"
                onClick={() => removeItem(index)}
              >
                <FiTrash2 />
              </button>
            )}
          </div>
        ))}
      </div>

      <button type="button" className="qg-add-item-btn" onClick={addItem}>
        <FiPlus /> Add Item
      </button>

      <div className="qg-total">
        <span>Total Amount:</span>
        <span className="qg-total-value">${total.toFixed(2)}</span>
      </div>

      <div className="qg-actions">
        <button type="button" className="qg-cancel-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="qg-approve-btn" onClick={handleSendApproval}>
          <FiCheck /> Send for Approval
        </button>
      </div>
    </div>
  );
};

export default QuoteGenerator;
