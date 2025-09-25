import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Button, PermissionsAndroid, Platform, Alert } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import io from 'socket.io-client';

const SERVER_URL = 'http://10.0.2.2:4000'; // Android emulator host IP

export default function App(){
  const [deviceId] = useState(() => uuidv4());
  const [status, setStatus] = useState('Initializing...');
  const [location, setLocation] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const trackingIntervalRef = useRef(null);

  useEffect(() => {
    console.log('Device ID:', deviceId);
    initializeWebSocket();
    requestPermissions();
    
    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, [deviceId]);

  const initializeWebSocket = () => {
    try {
      // Initialize Socket.io connection
      socketRef.current = io(SERVER_URL, {
        transports: ['websocket'],
        query: { deviceId }
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to server via WebSocket');
        setIsConnected(true);
        setStatus('Connected to server - Ready to track');
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
        setStatus('Disconnected from server');
      });

      socketRef.current.on('location_ack', (data) => {
        console.log('Server acknowledged location:', data);
      });

      socketRef.current.on('error', (error) => {
        console.error('WebSocket error:', error);
        setStatus('Connection error');
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android'){
      try {
        const perms = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
          PermissionsAndroid.PERMISSIONS.READ_SMS,
        ];
        
        const results = await PermissionsAndroid.requestMultiple(perms);
        console.log('Permission results:', results);
        
        if (results['android.permission.ACCESS_FINE_LOCATION'] === 'granted') {
          setStatus(isConnected ? 'Ready to track' : 'Permissions granted - Connecting...');
        } else {
          setStatus('Location permission required');
        }
      } catch(e) {
        console.warn('Error with permissions:', e);
        setStatus('Permission error');
      }
    }
  };

  const startLocationTracking = () => {
    if (!socketRef.current || !isConnected) {
      Alert.alert('Not Connected', 'Please wait for WebSocket connection');
      return;
    }

    // Simulate location updates via WebSocket
    trackingIntervalRef.current = setInterval(() => {
      const simulatedLocation = {
        deviceId,
        latitude: 17.3850 + (Math.random() - 0.5) * 0.01,
        longitude: 78.4867 + (Math.random() - 0.5) * 0.01,
        timestamp: new Date().toISOString(),
        type: 'location'
      };
      
      setLocation(simulatedLocation);
      
      // Send via WebSocket
      socketRef.current.emit('location_update', simulatedLocation);
    }, 3000); // Every 3 seconds
  };

  const startTracking = () => {
    setStatus('Tracking active - Sending real-time data');
    startLocationTracking();
    
    Alert.alert(
      'Tracking Started', 
      `Device: ${deviceId}\nReal-time WebSocket connection active`,
      [
        { 
          text: 'Stop Tracking', 
          onPress: () => {
            if (trackingIntervalRef.current) {
              clearInterval(trackingIntervalRef.current);
              trackingIntervalRef.current = null;
            }
            setStatus('Connected - Tracking stopped');
          }
        }
      ]
    );
  };

  const sendTestMessage = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('test_message', {
        deviceId,
        message: 'Hello from mobile app!',
        timestamp: new Date().toISOString()
      });
      Alert.alert('Test Message', 'Message sent via WebSocket');
    }
  };

  return (
    <View style={{flex:1, alignItems:'center', justifyContent:'center', padding: 20}}>
      <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 15}}>Device Tracker</Text>
      
      <Text style={{marginBottom: 5}}>Device ID: {deviceId}</Text>
      
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
        <View style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: isConnected ? 'green' : 'red',
          marginRight: 8
        }} />
        <Text>WebSocket: {isConnected ? 'Connected' : 'Disconnected'}</Text>
      </View>
      
      <Text style={{marginBottom: 10}}>Status: {status}</Text>
      
      {location && (
        <Text style={{marginBottom: 10, textAlign: 'center'}}>
          📍 Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </Text>
      )}
      
      <Button 
        title={isConnected ? "Start Real-time Tracking" : "Connecting..."} 
        onPress={startTracking}
        disabled={!isConnected}
      />
      
      <View style={{marginTop: 10}}>
        <Button 
          title="Send Test Message" 
          onPress={sendTestMessage}
          disabled={!isConnected}
        />
      </View>
    </View>
  );
}
