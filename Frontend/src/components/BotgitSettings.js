import React, { useState } from 'react';
import { Form, Button, Container, Card } from 'react-bootstrap';
import './BotgitSettings.css';

const BotgitSettings = () => {
  const [settings, setSettings] = useState({
    autoScrape: false,
    scrapeInterval: '24',
    maxProfiles: '100',
    saveEmails: true,
    savePhones: true,
    notifyOnComplete: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement settings save functionality
    console.log('Settings saved:', settings);
  };

  return (
    <Container className="botgit-settings-container">
      <h2>Botgit Settings</h2>
      <Card>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="autoScrape"
                name="autoScrape"
                label="Enable Automatic Scraping"
                checked={settings.autoScrape}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Scraping Interval (hours)</Form.Label>
              <Form.Control
                type="number"
                name="scrapeInterval"
                value={settings.scrapeInterval}
                onChange={handleChange}
                min="1"
                max="168"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Maximum Profiles to Scrape</Form.Label>
              <Form.Control
                type="number"
                name="maxProfiles"
                value={settings.maxProfiles}
                onChange={handleChange}
                min="1"
                max="1000"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="saveEmails"
                name="saveEmails"
                label="Save Email Addresses"
                checked={settings.saveEmails}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="savePhones"
                name="savePhones"
                label="Save Phone Numbers"
                checked={settings.savePhones}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="notifyOnComplete"
                name="notifyOnComplete"
                label="Notify when scraping completes"
                checked={settings.notifyOnComplete}
                onChange={handleChange}
              />
            </Form.Group>

            <Button variant="primary" type="submit">
              Save Settings
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default BotgitSettings;