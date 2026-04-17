// backend/simulator.js
const { BUSES, ROUTES, SCHOOL } = require('./demoData');
const config = require('./config');

let state = [];
const geofenceAlerted = new Set();

const startSimulator = () => {
  state = BUSES.map((bus, idx) => {
    const route   = ROUTES[bus.routeKey];
    const startWp = (idx * 3) % route.length;
    return {
      ...bus,
      lat:          route[startWp].lat,
      lng:          route[startWp].lng,
      speed:        0,
      heading:      0,
      status:       'active',
      wpIndex:      startWp,
      progress:     Math.random(),
      trail:        [[route[startWp].lat, route[startWp].lng]],
      lastTrailWp:  startWp,
      ts:           Date.now(),
      stopTimer:    0,
      currentSpeed: 0,
      geofenceAlert: null,
    };
  });

  [2, 9, 18].forEach(idx => {
    if (state[idx]) state[idx].status = 'offline';
  });

  setInterval(tick, 2000);
  console.log(`Simulator: ${state.length} buses running`);
};

const tick = () => {
  state = state.map(moveBus);
  checkGeofences();
};

const moveBus = (bus) => {
  if (bus.status === 'offline') {
    if (Math.random() < 0.003) return { ...bus, status: 'active', ts: Date.now() };
    return { ...bus, ts: Date.now() };
  }

  if (bus.stopTimer > 0) {
    return { ...bus, speed: 0, status: 'stopped', stopTimer: bus.stopTimer - 1, ts: Date.now() };
  }

  const route = ROUTES[bus.routeKey];
  const curr  = route[bus.wpIndex];
  const nextI = (bus.wpIndex + 1) % route.length;
  const next  = route[nextI];

  const targetSpeed = 18 + Math.random() * 22;
  const speed       = Math.max(8, Math.min(45,
    bus.currentSpeed + (targetSpeed - bus.currentSpeed) * 0.15
  ));

  const moved    = (speed / 3600) * 1.5;
  const segDist  = haversine(curr.lat, curr.lng, next.lat, next.lng);
  const inc      = segDist > 0 ? moved / segDist : 0.1;
  let   progress = bus.progress + inc;
  let   wpIndex  = bus.wpIndex;
  let   lat, lng;

  let reachedNewWaypoint = false;

  if (progress >= 1) {
    progress  = 0;
    wpIndex   = nextI;
    lat       = next.lat;
    lng       = next.lng;
    reachedNewWaypoint = true;
  } else {
    lat = curr.lat + (next.lat - curr.lat) * progress;
    lng = curr.lng + (next.lng - curr.lng) * progress;
  }

  const head      = bearing(bus.lat, bus.lng, lat, lng);
  const willStop  = Math.random() < 0.04;
  const stopTimer = willStop ? Math.floor(3 + Math.random() * 8) : 0;

  // Trail follows actual route waypoints only — no displacement interpolation points
  let trail = bus.trail || [];
  if (reachedNewWaypoint && wpIndex !== bus.lastTrailWp) {
    let idx = (bus.lastTrailWp + 1) % route.length;
    let safetyCount = 0;
    while (safetyCount < route.length) {
      trail = [...trail, [route[idx].lat, route[idx].lng]];
      if (idx === wpIndex) break;
      idx = (idx + 1) % route.length;
      safetyCount++;
    }
    trail = trail.slice(-300);
  }

  if (Math.random() < 0.0008) {
    return { ...bus, status: 'offline', lat, lng, trail, ts: Date.now() };
  }

  return {
    ...bus,
    lat, lng,
    speed:        Math.round(speed),
    heading:      Math.round(head),
    status:       willStop ? 'stopped' : 'active',
    wpIndex,
    progress,
    trail,
    lastTrailWp:  reachedNewWaypoint ? wpIndex : bus.lastTrailWp,
    stopTimer,
    currentSpeed: speed,
    ts:           Date.now(),
    geofenceAlert: bus.geofenceAlert,
  };
};

const checkGeofences = () => {
  const avgSpd = config.GEOFENCE.AVG_SPEED_KMPH;
  const alertM = config.GEOFENCE.ALERT_MINUTES;

  state.forEach(bus => {
    if (bus.status !== 'active') return;
    const distKm  = haversine(bus.lat, bus.lng, SCHOOL.lat, SCHOOL.lng);
    const etaMins = (distKm / avgSpd) * 60;
    const dateKey  = new Date().toDateString();
    const alertKey = `${bus.id}-${dateKey}`;

    if (etaMins <= alertM && etaMins > 0.5) {
      if (!geofenceAlerted.has(alertKey)) {
        geofenceAlerted.add(alertKey);
        bus.geofenceAlert = {
          busNumber: bus.number,
          routeName: bus.routeName,
          etaMins:   Math.round(etaMins),
          distKm:    distKm.toFixed(2),
          ts:        Date.now(),
        };
        setTimeout(() => { bus.geofenceAlert = null; }, 60000);
        console.log(`Geofence: Bus ${bus.number} ~${Math.round(etaMins)} min from school`);
      }
    }
  });
};

const haversine = (la1, lo1, la2, lo2) => {
  const R = 6371, r = Math.PI / 180;
  const dL = (la2-la1)*r, dG = (lo2-lo1)*r;
  const a  = Math.sin(dL/2)**2 + Math.cos(la1*r)*Math.cos(la2*r)*Math.sin(dG/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const bearing = (la1, lo1, la2, lo2) => {
  const r  = Math.PI/180;
  const dG = (lo2-lo1)*r;
  const y  = Math.sin(dG)*Math.cos(la2*r);
  const x  = Math.cos(la1*r)*Math.sin(la2*r) - Math.sin(la1*r)*Math.cos(la2*r)*Math.cos(dG);
  return ((Math.atan2(y,x)*180/Math.PI)+360)%360;
};

const getAllBuses = () => state.map(b => ({
  id: b.id, number: b.number, routeName: b.routeName,
  driverName: b.driverName, driverPhone: b.driverPhone,
  lat: b.lat, lng: b.lng, speed: b.speed, heading: b.heading,
  status: b.status, trail: b.trail, ts: b.ts,
  geofenceAlert: b.geofenceAlert || null,
}));

const getBusById = id => getAllBuses().find(b => b.id === id) || null;

module.exports = { startSimulator, getAllBuses, getBusById };
