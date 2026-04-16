// backend/config.js
// ╔══════════════════════════════════════════════════════════════╗
// ║  SSRVM GPS — CONFIGURATION FILE                             ║
// ║  Change placeholders below when school provides details     ║
// ╚══════════════════════════════════════════════════════════════╝
module.exports = {

  AUTH: {
    USERNAME: 'ssrvm',
    PASSWORD: 'Ssrvm@2026',
  },

  JWT_SECRET:  'ssrvm-agartala-gps-secret-2026',
  JWT_EXPIRES: '30d',

  SCHOOL: {
    NAME:    'Sri Sri Ravishankar Vidya Mandir',
    BRANCH:  'Agartala',
    SHORT:   'SSRVM Agartala',
    ADDRESS: 'Agartala, Tripura 799001',   // TODO: real address
    PHONE:   '+91 XXXXXXXXXX',             // TODO: school phone
    LAT:      23.8103,                     // TODO: confirm exact coordinates
    LNG:      91.2661,
  },

  GEOFENCE: {
    ALERT_MINUTES: 10,
    AVG_SPEED_KMPH: 25,
  },

  MAP: {
    DEFAULT_LAT:  23.8315,
    DEFAULT_LNG:  91.2868,
    DEFAULT_ZOOM: 13,
    BUS_ZOOM:     15,
  },

  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
