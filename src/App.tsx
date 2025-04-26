import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { contractAddress, contractABI } from '../contracts/landRegistry.tsx';
import { createTable, insertPropertyRecord, PropertyRecord } from './services/dbService';
import PropertyRecords from './components/PropertyRecords';
import './App.css';

// Add proper type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}

interface TransactionDetails {
  hash: string;
  timestamp: string;
  status: string;
  blockNumber: string;
  propertyId?: number;
  location?: string;
  area?: number;
  owner?: string;
  newOwner?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'register' | 'records' | 'transfer'>('register');
  const [account, setAccount] = useState<string>('');
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);

  const [propertyId, setPropertyId] = useState('');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState('');
  const [owner, setOwner] = useState('');
  
  // Transfer form state
  const [transferPropertyId, setTransferPropertyId] = useState('');
  const [newOwner, setNewOwner] = useState('');

  useEffect(() => {
    // Initialize database table
    createTable().catch(console.error);
  }, []);

  const decodeTransactionData = (data: string) => {
    try {
      const iface = new ethers.Interface(contractABI);
      const decodedData = iface.parseTransaction({ data });
      
      if (decodedData?.name === 'registerProperty') {
        return {
          propertyId: decodedData.args[0].toString(),
          location: decodedData.args[1],
          area: decodedData.args[2].toString(),
          owner: decodedData.args[3]
        };
      } else if (decodedData?.name === 'transferOwnership') {
        return {
          propertyId: decodedData.args[0].toString(),
          newOwner: decodedData.args[1]
        };
      }
      return null;
    } catch (err) {
      console.error('Error decoding transaction data:', err);
      return null;
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("Please install MetaMask to use this application");
        return;
      }

      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      setAccount(await signer.getAddress());

      const landContract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      setContract(landContract);
      setError('');
    } catch (err) {
      console.log(err);
      setError("Failed to connect wallet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const registerProperty = async () => {
    if (!contract) {
      setError("Contract not connected. Please connect your wallet first.");
      return;
    }

    if (!propertyId || !location || !area || !owner) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      const tx = await contract.registerProperty(
        parseInt(propertyId),
        location,
        parseInt(area),
        owner
      );
      await tx.wait();
      setError('');
      
      // Fetch transaction details
      await fetchTransactionDetails(tx.hash);
      
      alert("Property successfully registered on the blockchain!");
      // Clear form
      setPropertyId('');
      setLocation('');
      setArea('');
      setOwner('');
    } catch (err) {
      console.log(err)
      setError("Failed to register property. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const transferProperty = async () => {
    if (!contract) {
      setError("Contract not connected. Please connect your wallet first.");
      return;
    }

    if (!transferPropertyId || !newOwner) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      const tx = await contract.transferOwnership(
        parseInt(transferPropertyId),
        newOwner
      );
      await tx.wait();
      setError('');
      
      // Fetch transaction details
      await fetchTransactionDetails(tx.hash);
      
      alert("Property ownership successfully transferred!");
      // Clear form
      setTransferPropertyId('');
      setNewOwner('');
    } catch (err) {
      setError("Failed to transfer property. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactionDetails = async (txHash: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_ETHERSCAN_API_URL}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${import.meta.env.VITE_ETHERSCAN_API_KEY}`
      );
      const data = await response.json();
      
      if (data.result) {
        const blockResponse = await fetch(
          `${import.meta.env.VITE_ETHERSCAN_API_URL}?module=proxy&action=eth_getBlockByNumber&tag=${data.result.blockNumber}&boolean=true&apikey=${import.meta.env.VITE_ETHERSCAN_API_KEY}`
        );
        const blockData = await blockResponse.json();
        
        const decodedData = decodeTransactionData(data.result.input);
        
        const transactionDetails = {
          hash: txHash,
          timestamp: new Date(parseInt(blockData.result.timestamp) * 1000).toLocaleString(),
          status: 'Success',
          blockNumber: parseInt(data.result.blockNumber, 16).toString(),
          ...(decodedData && {
            propertyId: parseInt(decodedData.propertyId),
            ...(decodedData.location && { location: decodedData.location }),
            ...(decodedData.area && { area: parseInt(decodedData.area) }),
            ...(decodedData.owner && { owner: decodedData.owner }),
            ...(decodedData.newOwner && { newOwner: decodedData.newOwner })
          })
        };

        setTransactionDetails(transactionDetails);

        // Save to database if we have property details from registration
        if (decodedData && decodedData.location) {
          const record: PropertyRecord = {
            transaction_hash: txHash,
            block_number: transactionDetails.blockNumber,
            property_id: parseInt(decodedData.propertyId),
            location: decodedData.location,
            area: parseInt(decodedData.area),
            owner: decodedData.owner,
            timestamp: new Date(parseInt(blockData.result.timestamp) * 1000).toISOString()
          };
          await insertPropertyRecord(record);
        }
      }
    } catch (err) {
      console.error('Error fetching transaction details:', err);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🏠 Land Registry Blockchain</h1>
        <p className="subtitle">Secure and Transparent Property Registration</p>
      </header>

      <section className="wallet-section">
        <button 
          className="connect-button" 
          onClick={connectWallet}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
        {account && (
          <p className="account-info">
            <strong>Connected Account:</strong> {account}
          </p>
        )}
      </section>

      {error && <div className="error-message">{error}</div>}

      <div className="tabs">
        <button 
          className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          Register Property
        </button>
        <button 
          className={`tab-button ${activeTab === 'transfer' ? 'active' : ''}`}
          onClick={() => setActiveTab('transfer')}
        >
          Transfer Property
        </button>
        <button 
          className={`tab-button ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          Property Records
        </button>
      </div>

      <main className="main-content">
        {activeTab === 'register' && (
          <section className="property-section">
            <h2>Register New Property</h2>
            <div className="form-group">
              <input 
                type="number"
                placeholder="Property ID" 
                value={propertyId}
                onChange={e => setPropertyId(e.target.value)}
                className="form-input"
              />
              <input 
                placeholder="Location" 
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="form-input"
              />
              <input 
                type="number"
                placeholder="Area (sq ft)" 
                value={area}
                onChange={e => setArea(e.target.value)}
                className="form-input"
              />
              <input 
                placeholder="Owner Address" 
                value={owner}
                onChange={e => setOwner(e.target.value)}
                className="form-input"
              />
              <button 
                className="submit-button"
                onClick={registerProperty}
                disabled={isLoading}
              >
                {isLoading ? 'Registering...' : 'Register Property'}
              </button>
            </div>

            {transactionDetails && (
              <div className="transaction-details">
                <h3>Transaction Details</h3>
                <p><strong>Transaction Hash:</strong> {transactionDetails.hash}</p>
                <p><strong>Block Number:</strong> {transactionDetails.blockNumber}</p>
                <p><strong>Timestamp:</strong> {transactionDetails.timestamp}</p>
                <p><strong>Status:</strong> {transactionDetails.status}</p>
                
                {transactionDetails.propertyId && (
                  <div className="property-info">
                    <h4>Property Information</h4>
                    <p><strong>Property ID:</strong> {transactionDetails.propertyId}</p>
                    <p><strong>Location:</strong> {transactionDetails.location}</p>
                    <p><strong>Area:</strong> {transactionDetails.area} sq ft</p>
                    <p><strong>Owner:</strong> {transactionDetails.owner}</p>
                  </div>
                )}
                
                <a 
                  href={`https://sepolia.etherscan.io/tx/${transactionDetails.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="etherscan-link"
                >
                  View on Etherscan
                </a>
              </div>
            )}
          </section>
        )}

        {activeTab === 'transfer' && (
          <section className="property-section">
            <h2>Transfer Property Ownership</h2>
            <div className="form-group">
              <input 
                type="number"
                placeholder="Property ID" 
                value={transferPropertyId}
                onChange={e => setTransferPropertyId(e.target.value)}
                className="form-input"
              />
              <input 
                placeholder="New Owner Address" 
                value={newOwner}
                onChange={e => setNewOwner(e.target.value)}
                className="form-input"
              />
              <button 
                className="submit-button"
                onClick={transferProperty}
                disabled={isLoading}
              >
                {isLoading ? 'Transferring...' : 'Transfer Ownership'}
              </button>
            </div>

            {transactionDetails && (
              <div className="transaction-details">
                <h3>Transaction Details</h3>
                <p><strong>Transaction Hash:</strong> {transactionDetails.hash}</p>
                <p><strong>Block Number:</strong> {transactionDetails.blockNumber}</p>
                <p><strong>Timestamp:</strong> {transactionDetails.timestamp}</p>
                <p><strong>Status:</strong> {transactionDetails.status}</p>
                
                {transactionDetails.propertyId && (
                  <div className="property-info">
                    <h4>Transfer Information</h4>
                    <p><strong>Property ID:</strong> {transactionDetails.propertyId}</p>
                    <p><strong>New Owner:</strong> {transactionDetails.newOwner}</p>
                  </div>
                )}
                
                <a 
                  href={`https://sepolia.etherscan.io/tx/${transactionDetails.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="etherscan-link"
                >
                  View on Etherscan
                </a>
              </div>
            )}
          </section>
        )}

        {activeTab === 'records' && <PropertyRecords />}
      </main>
    </div>
  );
}

export default App;
