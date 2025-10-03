import React, { useEffect, useState } from 'react';
import { Table, Container, Alert, Spinner, Button } from 'react-bootstrap';
import './BotgitData.css';

const BotgitData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/scraped-data');
        if (!res.ok) {
          const errorText = await res.text();
          console.error('API Error Response:', errorText);
          throw new Error(`Failed to fetch scraped data (Status: ${res.status}). Server response: ${errorText.substring(0, 100)}...`);
        }
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          setData(json.data || []);
        } catch (parseError) {
          console.error('API Response:', text);
          throw new Error(`Failed to parse JSON response. Received: ${text.substring(0, 100)}...`);
        }
      } catch (err) {
        console.error('BotgitData Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshIndex]);

  return (
    <Container className="botgit-data-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">LinkedIn Scraped Data</h2>
        <Button size="sm" onClick={() => setRefreshIndex(i => i + 1)} disabled={loading}>
          Refresh
        </Button>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {loading && (
        <div className="text-center my-4">
          <Spinner animation="border" role="status" />
        </div>
      )}
      {!loading && !error && data.length === 0 && (
        <Alert variant="info">No scraped profiles found yet.</Alert>
      )}
      {!loading && !error && data.length > 0 && (
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
            {data.map((entry) => (
              <tr key={entry._id || entry.profileUrl}>
                <td>{entry.name || '-'}</td>
                <td>{entry.location || '-'}</td>
                <td>
                  {entry.profileUrl ? (
                    <a href={entry.profileUrl} target="_blank" rel="noopener noreferrer">
                      {entry.profileUrl}
                    </a>
                  ) : '-'}
                </td>
                <td>{entry.email || '-'}</td>
                <td>{entry.phone || '-'}</td>
                <td>{entry.role || '-'}</td>
                <td>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : (entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-')}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default BotgitData;