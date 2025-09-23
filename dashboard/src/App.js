import React, {useEffect,useState,useRef} from 'react';
import io from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

const SERVER = 'http://192.168.1.4:4000'; // replace with your PC IP

export default function App(){
  const [devices, setDevices] = useState({});
  const socketRef = useRef();

  useEffect(()=>{
    console.log('Connecting to server at', SERVER);
    socketRef.current = io(SERVER);
    socketRef.current.on('connect', () => console.log('Connected to server'));
    socketRef.current.on('connect_error', (err) => console.log('Connection error:', err));
    socketRef.current.on('deviceLocation', ({deviceId,payload})=>{
      console.log('Received deviceLocation for', deviceId, payload);
      setDevices(prev => ({ ...prev, [deviceId]: { ...(prev[deviceId]||{}), latest: payload, sms: prev[deviceId]?.sms || [] } }));
    });
    socketRef.current.on('deviceSms', ({deviceId,payload})=>{
      console.log('Received deviceSms for', deviceId, payload);
      setDevices(prev=>{
        const d = prev[deviceId] || { latest: null, sms: [] };
        return { ...prev, [deviceId]: { ...d, sms: [payload, ...d.sms] } };
      });
    });
    console.log('Fetching devices from', `${SERVER}/api/devices`);
    fetch(`${SERVER}/api/devices`).then(r=>r.json()).then(data=>{
      console.log('Fetched devices:', data);
      const obj={};
      data.devices.forEach(d=> obj[d.deviceId] = { latest:d.latest, sms: [] });
      setDevices(obj);
    }).catch(err => console.log('Fetch error:', err));
    return ()=> socketRef.current.disconnect();
  },[]);

  return (
    <div style={{display:'flex',height:'100vh'}}>
      <div style={{width:280,padding:12,borderRight:'1px solid #ddd',overflowY:'auto'}}>
        <h3>Devices</h3>
        {Object.keys(devices).map(id=>{
          const last = devices[id].latest;
          return <div key={id} style={{marginBottom:8,cursor:'pointer'}}><strong>{id}</strong><div style={{fontSize:12}}>{ last ? new Date(last.ts).toLocaleTimeString() : 'no location yet' }</div></div>;
        })}
      </div>
      <div style={{flex:1}}>
        <MapContainer center={[20,0]} zoom={2} style={{height:'100%'}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          {Object.entries(devices).map(([id,d])=> d.latest ? (
            <Marker key={id} position={[d.latest.latitude, d.latest.longitude]}>
              <Popup><div><strong>{id}</strong><br/>{new Date(d.latest.ts).toLocaleString()}</div></Popup>
            </Marker>
          ) : null)}
        </MapContainer>
      </div>
      <div style={{width:360,padding:12,borderLeft:'1px solid #ddd',overflowY:'auto'}}>
        <h3>SMS Log</h3>
        {Object.entries(devices).flatMap(([id,d]) => (d.sms||[]).map((s,i)=>(
          <div key={id+'-'+i} style={{marginBottom:10,borderBottom:'1px solid #eee',paddingBottom:8}}>
            <div><strong>{id}</strong> - {new Date(s.ts).toLocaleString()}</div>
            <div><strong>From:</strong> {s.from}</div>
            <div>{s.text}</div>
          </div>
        )))}
      </div>
    </div>
  );
}
