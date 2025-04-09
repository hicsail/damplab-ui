import React, { useState } from 'react';
import { useApolloClient, ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { updateSequence } from '../mpi/SequencesQueries';
import { Sequence } from '../mpi/types';

interface SequenceEditorProps {
  sequence: Sequence;
  onSave: () => void;
  onCancel: () => void;
}

const SequenceEditor: React.FC<SequenceEditorProps> = ({ sequence, onSave, onCancel }) => {
  const [editedSequence, setEditedSequence] = useState<Sequence>(sequence);
  const client = useApolloClient() as ApolloClient<NormalizedCacheObject>;

  const handleSave = async () => {
    try {
      await updateSequence(client, sequence.id, editedSequence);
      onSave();
    } catch (error) {
      console.error('Error updating sequence:', error);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={editedSequence.name}
        onChange={(e) => setEditedSequence({ ...editedSequence, name: e.target.value })}
      />
      <textarea
        value={editedSequence.seq}
        onChange={(e) => setEditedSequence({ ...editedSequence, seq: e.target.value })}
      />
      <button onClick={handleSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default SequenceEditor; 