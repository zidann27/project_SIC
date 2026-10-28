const CONFIG = {
  MQTT: {
    host: "broker.hivemq.com",
    port: 8884,
    protocol: "wss",
    path: "/mqtt",
    dataTopic: "sic8/agnan/smartwatering/data",
    statusTopic: "sic8/agnan/smartwatering/status",
  },
  SYSTEM: {
    soilThreshold: 30, // %
    staleTimeout: 10000, // 10 detik
    maxChartPoints: 1000,
    maxLogEntries: 50,
  },
};
