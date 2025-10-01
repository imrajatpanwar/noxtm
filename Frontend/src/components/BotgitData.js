import React from 'react';
import { Table, Container } from 'react-bootstrap';
import './BotgitData.css';

const BotgitData = () => {
  // TODO: This will be replaced with actual data fetching logic
  const scrapedData = [
    {
      name: 'Sample Name',
      location: 'Sample Location',
      profileUrl: 'https://linkedin.com/sample',
      email: 'sample@email.com',
      phone: '+1234567890',
      role: 'Sample Role',
      timestamp: new Date().toISOString()
    }
  ];

  return (
    <Container className="botgit-data-container">
      <h2>LinkedIn Scraped Data</h2>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Name</th>
            <th>Location</th>
            <th>Profile URL</th>
            <th>E-mail</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {scrapedData.map((entry, index) => (
            <tr key={index}>
              <td>{entry.name}</td>
              <td>{entry.location}</td>
              <td>
                <a href={entry.profileUrl} target="_blank" rel="noopener noreferrer">
                  {entry.profileUrl}
                </a>
              </td>
              <td>{entry.email}</td>
              <td>{entry.phone}</td>
              <td>{entry.role}</td>
              <td>{new Date(entry.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default BotgitData;