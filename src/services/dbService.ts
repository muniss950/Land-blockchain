import pool from '../config/db';

export interface PropertyRecord {
  transaction_hash: string;
  block_number: string;
  property_id: number;
  location: string;
  area: number;
  owner: string;
  timestamp: string;
}

const API_BASE_URL = 'http://localhost:3001/api';

export const createTable = async () => {
  // This is now handled by the backend server
  return Promise.resolve();
};

export const insertPropertyRecord = async (record: PropertyRecord) => {
  try {
    console.log('Sending property record to API:', record);
    
    const response = await fetch(`${API_BASE_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      throw new Error('Failed to insert property record');
    }

    const result = await response.json();
    console.log('API Response:', result);
    return result;
  } catch (error) {
    console.error('Error inserting record:', error);
    throw error;
  }
};

export const getAllPropertyRecords = async (): Promise<PropertyRecord[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/properties`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch property records');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching records:', error);
    throw error;
  }
}; 