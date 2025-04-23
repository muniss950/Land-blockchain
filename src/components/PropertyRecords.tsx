import { useEffect, useState } from 'react';
import { PropertyRecord, getAllPropertyRecords } from '../services/dbService';
import './PropertyRecords.css';

const PropertyRecords = () => {
  const [records, setRecords] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const data = await getAllPropertyRecords();
        setRecords(data);
        setError('');
      } catch (err) {
        setError('Failed to fetch property records');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  if (loading) {
    return <div className="loading">Loading records...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="records-container">
      <h2>Property Records</h2>
      <div className="records-table-container">
        <table className="records-table">
          <thead>
            <tr>
              <th>Transaction Hash</th>
              <th>Block Number</th>
              <th>Property ID</th>
              <th>Location</th>
              <th>Area (sq ft)</th>
              <th>Owner</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.transaction_hash}>
                <td className="hash-cell">{record.transaction_hash}</td>
                <td>{record.block_number}</td>
                <td>{record.property_id}</td>
                <td>{record.location}</td>
                <td>{record.area}</td>
                <td className="address-cell">{record.owner}</td>
                <td>{new Date(record.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PropertyRecords; 