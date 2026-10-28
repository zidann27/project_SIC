const MqttService = (() => {
  let client = null;
  let isConnected = false;

  // Callbacks yg diset oleh app.js
  let onConnectCb = null;
  let onDisconnectCb = null;
  let onDataCb = null;
  let onStatusCb = null;
  let onErrorCb = null;

  const connect = () => {
    const { host, port, protocol, path, dataTopic, statusTopic } = CONFIG.MQTT;
    const url = `${protocol}://${host}:${port}${path}`;

    client = mqtt.connect(url, {
      clientId: "webclient_" + Math.random().toString(16).substr(2, 8),
      reconnectPeriod: 3000,
    });

    client.on("connect", () => {
      isConnected = true;
      client.subscribe([dataTopic, statusTopic], (err) => {
        if (!err && onConnectCb) onConnectCb();
      });
    });

    client.on("offline", () => {
      isConnected = false;
      if (onDisconnectCb) onDisconnectCb();
    });

    client.on("close", () => {
      isConnected = false;
      if (onDisconnectCb) onDisconnectCb();
    });

    client.on("message", (topic, message) => {
      try {
        const payloadRaw = message.toString();

        if (topic === dataTopic) {
          const data = JSON.parse(payloadRaw);
          if (validateData(data) && onDataCb) {
            onDataCb(data);
          } else if (onErrorCb) {
            onErrorCb("Payload data sensor tidak valid");
          }
        } else if (topic === statusTopic) {
          if (onStatusCb) onStatusCb(payloadRaw);
        }
      } catch (e) {
        if (onErrorCb) onErrorCb("Gagal parsing JSON MQTT");
      }
    });
  };

  const validateData = (data) => {
    if (typeof data.soil !== "number" || data.soil < 0 || data.soil > 100)
      return false;
    if (typeof data.temperature !== "number") return false;
    if (
      typeof data.humidity !== "number" ||
      data.humidity < 0 ||
      data.humidity > 100
    )
      return false;
    if (data.pump !== "ON" && data.pump !== "OFF") return false;
    return true;
  };

  return {
    connect,
    setCallbacks: (callbacks) => {
      onConnectCb = callbacks.onConnect;
      onDisconnectCb = callbacks.onDisconnect;
      onDataCb = callbacks.onData;
      onStatusCb = callbacks.onStatus;
      onErrorCb = callbacks.onError;
    },
  };
})();
