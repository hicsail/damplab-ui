import React, { useState, useEffect } from 'react';

import MPILoginForm from './MPILoginForm';


interface Sequence {
  id: string;
  name: string;
}


const SequenceDropdown: React.FC = () => {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const fetchSequences = async () => {
    try {
      const response = await fetch('http://localhost:5100/mpi/sequences');

      if (!response.ok) {
        throw new Error('Failed to fetch sequences');
      }

      const data = await response.json();
      console.log(data);
      setSequences(data);
    } catch (err) {
      setError('Failed to load sequences. Please try again.');
      console.error(err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchSequences();
    }
  }, [isLoggedIn]);

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <>
      <MPILoginForm isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn}/>
      <select>
        {sequences.map((sequence) => (
          <option key={sequence.id} value={sequence.id}>
            {sequence.name}
          </option>
        ))}
      </select>
    </>
  );
};

export default SequenceDropdown;
