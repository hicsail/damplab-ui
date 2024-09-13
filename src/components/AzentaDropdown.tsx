import React, { useState, useEffect } from 'react';

import MPILoginForm from './MPILoginForm';

import { AzentaSeqOrder } from '../types/Types';

// interface AzentaOrder {
//   id: string;
//   orderName: string;
// }


const AzentaDropdown: React.FC = () => {
  const [azentaOrders, setAzentaOrders] = useState<AzentaSeqOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const fetchAzentaOrders = async () => {
    try {
      const response = await fetch('http://localhost:5100/mpi/azentaSeqOrders');

      if (!response.ok) {
        throw new Error('Failed to fetch Azenta Orders');
      }

      const data = await response.json();
      console.log(data);
      setAzentaOrders(data);
    } catch (err) {
      setError('Failed to load Azenta Orders. Please try again.');
      console.error(err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchAzentaOrders();
    }
  }, [isLoggedIn]);

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <>
      {
        isLoggedIn ? 
        ( <select>
            {azentaOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.orderName}
              </option>
            ))}
          </select>
        ) : (
          <MPILoginForm isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn}/>
        )
      }
    </>
  );
};

export default AzentaDropdown;
