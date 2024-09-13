import React, { useState, useEffect } from 'react';
import { Box, Button, Checkbox, TextField, Typography, FormControlLabel } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RotateRightIcon from '@mui/icons-material/RotateRight';

const RotatingIcons = () => {
  const [progress, setProgress] = useState({
    icon1: false,
    icon2: false,
    icon3: false,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // To store the uploaded file

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    if (selectedFile) {
      // You can handle file upload logic here
      console.log(`Uploading: ${selectedFile.name}`);
    }
  };

  useEffect(() => {
    if (isRunning) {
      let timer1 = setTimeout(() => {
        setProgress(prev => ({ ...prev, icon1: true }));
      }, 2000);
      
      let timer2 = setTimeout(() => {
        setProgress(prev => ({ ...prev, icon2: true }));
      }, 4000);
      
      let timer3 = setTimeout(() => {
        setProgress(prev => ({ ...prev, icon3: true }));
        setIsCompleted(true);
        setIsRunning(false);
      }, 6000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isRunning]);

  const createAzentaOrder = async () => {
    try {
      const response = await fetch(`http://localhost:5100/mpi/azentaCreateSeqOrder`);
      if (!response.ok) {
        throw new Error('Azenta orders not found...');
      }
      const data = await response.json();
      console.log('Created Azenta Order: ', data);
      window.location.href = 'http://localhost:3000/services/azenta';
    } catch (error) {
      console.error('Error fetching Azenta orders: ', error);
    }
  }; 

  const handleStart = () => {
    setProgress({ icon1: false, icon2: false, icon3: false });
    setIsRunning(true);
    setIsCompleted(false);
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(event.target.checked);
  };

  return (
    <Box sx={{ textAlign: 'left' }}>

      <Box sx={{ mt: '20px', ml: 2 }}>
        <input type="file" accept=".seq,.gb,.gbk,.genbank,.ape,.fasta,.fas,.fa,.dna,.sbd" onChange={handleFileChange} />
      </Box>

      { (isRunning || isCompleted) ? (

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, mt: 3, ml: 2 }}>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {progress.icon1 ? (
              <>
                <CheckCircleIcon sx={{ color: 'green', fontSize: 30 }} />
                <Typography sx={{ ml: 2 }}>Screening: Passed</Typography>
              </>
            ) : (
              <>
                <RotateRightIcon sx={{ animation: 'spin 2s linear infinite', fontSize: 30 }} />
                <Typography sx={{ ml: 2 }}>Biosecurity Screening...</Typography>
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {progress.icon2 ? (
              <>
                <CheckCircleIcon sx={{ color: 'green', fontSize: 30 }} />
                <Typography sx={{ ml: 2 }}>Complexity score: 8.0</Typography>
              </>
            ) : (
              <>
                <RotateRightIcon sx={{ animation: 'spin 2s linear infinite', fontSize: 30 }} />
                <Typography sx={{ ml: 2 }}>Checking Manufacturability...</Typography>
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {progress.icon3 ? (
              <>
                <CheckCircleIcon sx={{ color: 'green', fontSize: 30 }} />
                <Typography sx={{ ml: 2 }}>
                  {isChecked ? 'Best option: DAMP Lab' : 'Cheapest option: Azenta'}
                </Typography>
              </>
            ) : (
              <>
                <RotateRightIcon sx={{ animation: 'spin 2s linear infinite', fontSize: 30 }} />
                <Typography sx={{ ml: 2 }}>Estimating Costs...</Typography>
              </>
            )}
          </Box>
        </Box>
      
      ) : (
        <></>
      )}

      {(isCompleted && !isChecked) ? (
        <Button variant="contained" color="secondary" sx={{ mt: 4 }} onClick={createAzentaOrder}>
          Start Azenta Order
        </Button>
      ) : (
        <></>
      )}

      <FormControlLabel
        control={<Checkbox checked={isChecked} onChange={handleCheckboxChange} />}
        label="DAMP Lab Discount"
        sx={{ mt: 2, ml: 2 }}
      />
      {!isRunning && !isCompleted && (
        <Button variant="contained" color="primary" sx={{ mt: 2, ml: 2 }} onClick={handleStart}>
          Evaluate Sequence
        </Button>
      )}
    </Box>
  );
};

export default RotatingIcons;
