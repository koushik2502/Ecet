import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Button, PermissionsAndroid, Platform, Alert } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import io from 'socket.io-client';
import Geolocation from 'react-native-geolocation-service';

// Use environment variable or default to emulator host
const SERVER_URL = __DEV__ 
  ? 'http://10.0.2.2:8000'  // Android emulator host IP for development
  : 'https://fe0019ff-a1d4-4601-a483-4283d7702511-00-3vpg0cs1vpn5a.sisko.replit.dev'; // Production server (Replit uses standard HTTPS port)

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
        // Request location permissions first (most important)
        const locationPermissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];
        
        const locationResults = await PermissionsAndroid.requestMultiple(locationPermissions);
        console.log('Location permission results:', locationResults);
        
        const fineLocationGranted = locationResults['android.permission.ACCESS_FINE_LOCATION'] === 'granted';
        const coarseLocationGranted = locationResults['android.permission.ACCESS_COARSE_LOCATION'] === 'granted';
        
        if (fineLocationGranted || coarseLocationGranted) {
          setStatus(isConnected ? 'Ready to track' : 'Location permissions granted - Connecting...');
          
          // Optional: Request SMS permissions separately
          const smsPermissions = [
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            PermissionsAndroid.PERMISSIONS.READ_SMS,
          ];
          
          const smsResults = await PermissionsAndroid.requestMultiple(smsPermissions);
          console.log('SMS permission results:', smsResults);
          
        } else {
          Alert.alert(
            'Location Permission Required',
            'This app needs location permission to track your device. Please grant location access in settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => {
                console.log('User should open app settings');
                setStatus('Please enable location permission in settings');
              }}
            ]
          );
          setStatus('Location permission required');
        }
      } catch(e) {
        console.warn('Error with permissions:', e);
        setStatus('Permission error: ' + e.message);
        Alert.alert('Permission Error', 'Failed to request permissions: ' + e.message);
      }
    }
  };

  const startLocationTracking = () => {
    if (!socketRef.current || !isConnected) {
      Alert.alert('Not Connected', 'Please wait for WebSocket connection');
      return;
    }

    // Get real GPS location using react-native-geolocation-service
    trackingIntervalRef.current = setInterval(() => {
      Geolocation.getCurrentPosition(
        (position) => {
          const realLocation = {
            deviceId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            type: 'location'
          };
          
          setLocation(realLocation);
          
          // Send real location via WebSocket
          socketRef.current.emit('location_update', realLocation);
          
          // Also send via HTTP API for compatibility
          fetch(`${SERVER_URL}/api/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId,
              type: 'location',
              payload: {
                latitude: realLocation.latitude,
                longitude: realLocation.longitude,
                accuracy: realLocation.accuracy,
                timestamp: realLocation.timestamp
              }
            })
          }).catch(err => console.log('HTTP update error:', err));
        },
        (error) => {
          console.log('Location error:', error.code, error.message);
          Alert.alert('Location Error', `Cannot get location: ${error.message}`);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
          forceRequestLocation: true,
          forceLocationManager: false,
          showLocationDialog: true,
          accuracy: {
            android: 'high',
            ios: 'best'
          }
        }
      );
    }, 5000); // Every 5 seconds
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
