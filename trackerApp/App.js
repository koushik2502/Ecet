import React, { useEffect, useState } from 'react';
import { View, Text, Button, PermissionsAndroid, Platform, NativeModules } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
const { NativeStarter } = NativeModules;

export default function App(){
  const [deviceId] = useState(() => uuidv4());

  useEffect(()=>{
    console.log('Device ID:', deviceId);
    console.log('NativeStarter available:', !!NativeStarter);
    async function prepare(){
      if (Platform.OS === 'android'){
        console.log('Requesting permissions...');
        const perms = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE
        ];
        const results = await PermissionsAndroid.requestMultiple(perms);
        console.log('Permission results:', results);
        console.log('Starting service with deviceId:', deviceId, 'URL: http://192.168.1.4:4000');
        try {
          NativeStarter.startService(deviceId, "http://192.168.1.4:4000");
          console.log('Service started successfully');
        } catch(e){
          console.warn('Error starting service:', e);
        }
      }
    }
    prepare();
  },[deviceId]);

  return (
    <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
      <Text>Tracker running (deviceId: {deviceId})</Text>
      <Button title="Start Service" onPress={()=>NativeStarter.startService(deviceId, "http://192.168.1.4:4000")} />
    </View>
  );
}
