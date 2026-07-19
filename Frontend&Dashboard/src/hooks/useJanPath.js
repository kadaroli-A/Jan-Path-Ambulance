import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL, POLLING_INTERVAL, AMBULANCE_ID, INITIAL_AMBULANCE_DATA } from '../constants/config';
console.log("PROJECT_CHECK_KADAR_777777");
console.log("KADAR_TEST_999999");
console.log("POLLING FROM CONFIG =", POLLING_INTERVAL);

export const useJanPath = () => {
  const [junctionData, setJunctionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [initialized, setInitialized] = useState(true);
  
  const pollingIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const initializedRef = useRef(false);

  // Initialize ambulance with POST request
  const initializeAmbulance = useCallback(async () => {
    console.log('🚑 Initializing ambulance with POST request...');
    console.log('POST URL:', `${API_BASE_URL}/ambulance/update`);
    console.log('POST Body:', INITIAL_AMBULANCE_DATA);
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/ambulance/update`,
        INITIAL_AMBULANCE_DATA,
        { timeout: 30000 }
      );
      
      console.log('✅ Ambulance initialized successfully:', response.data);
      setInitialized(true);
      setConnectionStatus('connected');
      return true;
    } catch (err) {
      console.error('❌ Failed to initialize ambulance:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to initialize system');
      setConnectionStatus('error');
      return false;
    }
  }, []);

  // Fetch junction data
  
     const fetchJunctionData = useCallback(async () => {

         try { 
      const url = `${API_BASE_URL}/priority-junction/${AMBULANCE_ID}`;
      console.log('📡 Polling:', url);
      
      const response = await axios.get(url, { timeout: 30000 });
      
      console.log('📥 Response received:', response.data);

      if (isMountedRef.current) {
        // Check if backend returns standby status
        if (
          response.data?.status === 'no junction found' ||
          response.data?.status === 'no junction in ETA range'
        ) {
          console.log('⏸️ System in standby mode');  
          setConnectionStatus('standby');
          setJunctionData(null);
          setLoading(false);
          return;
        } else {
          console.log('✅ Junction data updated:', {
            junction_id: response.data?.junction_id,
            eta: response.data?.eta,
            selected_lane: response.data?.selected_lane,
            urgency: response.data?.urgency,
            signal_action: response.data?.signal_action,
          });
          console.log("BACKEND RESPONSE", response.data);
          console.log("SETTING JUNCTION DATA");
          setJunctionData(response.data);
          console.log("LOADING FALSE");
          setLoading(false);
          setConnectionStatus('connected');
          setError(null);
        }
      }
    } catch (err) {
      console.error('❌ Polling error:', err);
      console.error('Error details:', err.response?.data || err.message);
      
      if (isMountedRef.current) {
        setError('Connection lost');
        setConnectionStatus('error');
        // Keep last valid data on error
      }
    }
  }, []);

  // Start polling
  const startPolling = useCallback(() => {
   console.log("POLLING VALUE =", POLLING_INTERVAL); 
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Initial fetch
    fetchJunctionData();

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      fetchJunctionData();
    }, POLLING_INTERVAL);
  }, [fetchJunctionData]);

  // Initialize on mount
  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    console.log('🚀 JAN-PATH System Starting...');
    isMountedRef.current = true;

    const init = async () => {

  const success = await initializeAmbulance();

  if(success){
      startPolling();
  }

};

    init();

    // Cleanup
    return () => {
      console.log('🛑 Cleaning up polling...');
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    junctionData,
    loading,
    error,
    connectionStatus,
  };
};
