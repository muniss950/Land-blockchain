import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { contractAddress, contractABI } from '../contracts/landRegistry.tsx';

function App() {
  const [account, setAccount] = useState<string>('');
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  const [propertyId, setPropertyId] = useState('');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState('');
  const [owner, setOwner] = useState('');

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");

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
    alert("Wallet Connected");
  };

  const registerProperty = async () => {
    if (!contract) return alert("Contract not connected");

    const tx = await contract.registerProperty(
      parseInt(propertyId),
      location,
      parseInt(area),
      owner
    );
    await tx.wait();
    alert("Property Registered!");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🏠 Land Registry (TypeScript)</h1>
      <button onClick={connectWallet}>Connect Wallet</button>
      <p><strong>Connected Account:</strong> {account}</p>

      <h3>Register New Property</h3>
      <input placeholder="Property ID" onChange={e => setPropertyId(e.target.value)} />
      <input placeholder="Location" onChange={e => setLocation(e.target.value)} />
      <input placeholder="Area (sq ft)" onChange={e => setArea(e.target.value)} />
      <input placeholder="Owner Address" onChange={e => setOwner(e.target.value)} />
      <button onClick={registerProperty}>Register Property</button>
    </div>
  );
}

export default App;
