// backend/demoData.js
// TODO: Replace with confirmed school coordinates
const SCHOOL = { lat: 23.8103, lng: 91.2661 };

const route = (stops) => {
  const fwd  = [SCHOOL, ...stops];
  const back = [...stops].reverse();
  return [...fwd, ...back, SCHOOL];
};

// TODO: Replace ALL routes with actual school bus routes
const ROUTES = {
  R01: route([
    { lat: 23.8420, lng: 91.2750 },
    { lat: 23.8500, lng: 91.2680 },
    { lat: 23.8580, lng: 91.2600 },
    { lat: 23.8650, lng: 91.2520 },
  ]),
  R02: route([
    { lat: 23.8280, lng: 91.3050 },
    { lat: 23.8220, lng: 91.3180 },
    { lat: 23.8150, lng: 91.3300 },
    { lat: 23.8080, lng: 91.3420 },
  ]),
  R03: route([
    { lat: 23.8380, lng: 91.2780 },
    { lat: 23.8430, lng: 91.2650 },
    { lat: 23.8500, lng: 91.2530 },
    { lat: 23.8560, lng: 91.2400 },
  ]),
  R04: route([
    { lat: 23.8200, lng: 91.2750 },
    { lat: 23.8130, lng: 91.2680 },
    { lat: 23.8060, lng: 91.2600 },
    { lat: 23.7980, lng: 91.2520 },
  ]),
  R05: route([
    { lat: 23.8350, lng: 91.3000 },
    { lat: 23.8400, lng: 91.3100 },
    { lat: 23.8460, lng: 91.3200 },
    { lat: 23.8520, lng: 91.3300 },
  ]),
  R06: route([
    { lat: 23.8250, lng: 91.2900 },
    { lat: 23.8190, lng: 91.2820 },
    { lat: 23.8130, lng: 91.2750 },
    { lat: 23.8060, lng: 91.2680 },
  ]),
  R07: route([
    { lat: 23.8400, lng: 91.2950 },
    { lat: 23.8460, lng: 91.3000 },
    { lat: 23.8530, lng: 91.3060 },
    { lat: 23.8600, lng: 91.3120 },
  ]),
};

for (let i = 8; i <= 27; i++) {
  const key  = `R${String(i).padStart(2,'0')}`;
  const base = ROUTES[`R0${((i-1) % 7) + 1}`];
  const dLat = (Math.random() - 0.5) * 0.014;
  const dLng = (Math.random() - 0.5) * 0.014;
  ROUTES[key] = base.map((p, idx) => {
    const isSchool = idx === 0 || idx === base.length - 1;
    return isSchool ? { ...p } : { lat: p.lat + dLat, lng: p.lng + dLng };
  });
}

// TODO: Replace ALL driver names, phones, route names with real data
const BUSES = [
  { id:'bus-01', number:1,  routeName:'Motor Stand Route',      routeKey:'R01', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-02', number:2,  routeName:'Badharghat Route',       routeKey:'R02', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-03', number:3,  routeName:'Ramnagar Route',         routeKey:'R03', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-04', number:4,  routeName:'Palace Compound Route',  routeKey:'R04', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-05', number:5,  routeName:'Station Route',          routeKey:'R05', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-06', number:6,  routeName:'VIP Road Route',         routeKey:'R06', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-07', number:7,  routeName:'Dhaleswar Route',        routeKey:'R07', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-08', number:8,  routeName:'Krishnanagar Route',     routeKey:'R01', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-09', number:9,  routeName:'Hapania Route',          routeKey:'R02', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-10', number:10, routeName:'Majlishpur Route',       routeKey:'R03', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-11', number:11, routeName:'Abhoynagar Route',       routeKey:'R04', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-12', number:12, routeName:'Akhaura Road Route',     routeKey:'R05', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-13', number:13, routeName:'Barjala Route',          routeKey:'R06', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-14', number:14, routeName:'Santipara Route',        routeKey:'R07', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-15', number:15, routeName:'Battala Route',          routeKey:'R01', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-16', number:16, routeName:'Indranagar Route',       routeKey:'R02', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-17', number:17, routeName:'Belonia Road Route',     routeKey:'R03', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-18', number:18, routeName:'Ujjayanta Route',        routeKey:'R04', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-19', number:19, routeName:'Amtali Route',           routeKey:'R05', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-20', number:20, routeName:'Matinagar Route',        routeKey:'R06', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-21', number:21, routeName:'Longtarai Route',        routeKey:'R07', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-22', number:22, routeName:'Champaknagar Route',     routeKey:'R01', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-23', number:23, routeName:'Dukli Route',            routeKey:'R02', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-24', number:24, routeName:'Jogendranagar Route',    routeKey:'R04', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-25', number:25, routeName:'Radhakishorepur Route',  routeKey:'R05', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-26', number:26, routeName:'Bishalgarh Route',       routeKey:'R06', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
  { id:'bus-27', number:27, routeName:'Dhaleswar North Route',  routeKey:'R07', driverName:'TODO: Driver Name', driverPhone:'TODO: Phone' },
];

module.exports = { BUSES, ROUTES, SCHOOL };
