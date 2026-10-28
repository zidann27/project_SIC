document.addEventListener("DOMContentLoaded", () => {
  // State Management
  let staleTimer = null;
  let lastDataTime = null;
  let currentPumpState = null;
  let uiClockTimer = null;

  // Init Components
  ChartManager.init();
  updateClock();
  setInterval(updateClock, 1000);

  // DOM Elements
  const els = {
    connDot: document.getElementById("header-conn-dot"),
    connText: document.getElementById("header-conn-text"),
    devConn: document.getElementById("dev-conn-status"),
    devDataStatus: document.getElementById("dev-data-status"),
    devLastMsg: document.getElementById("dev-last-msg"),
    devDataAge: document.getElementById("dev-data-age"),
    devQuality: document.getElementById("dev-data-quality"),

    heroSoilVal: document.getElementById("hero-soil-val"),
    heroSoilStatus: document.getElementById("hero-soil-status"),
    soilGauge: document.getElementById("soil-gauge"),

    cSoilVal: document.getElementById("card-soil-val"),
    cSoilDesc: document.getElementById("card-soil-desc"),
    cSoilProg: document.getElementById("soil-progress"),
    cTempVal: document.getElementById("card-temp-val"),
    cTempDesc: document.getElementById("card-temp-desc"),
    cHumVal: document.getElementById("card-hum-val"),
    cPumpVal: document.getElementById("card-pump-val"),
    cPumpDesc: document.getElementById("card-pump-desc"),
    pumpCard: document.getElementById("pump-card"),
    taskList: document.getElementById("task-list"),

    activityLog: document.getElementById("activity-log"),
  };

  // UI Helpers
  function updateClock() {
    document.getElementById("header-time").textContent =
      new Date().toLocaleTimeString("id-ID");

    // Update data age ticker
    if (lastDataTime) {
      const diffSecs = Math.floor((Date.now() - lastDataTime) / 1000);
      els.devDataAge.textContent = `${diffSecs} detik`;
    }
  }

  function addLog(message) {
    const now = new Date().toLocaleTimeString("id-ID");
    const item = document.createElement("div");
    item.className = "log-item";
    item.innerHTML = `<span class="log-time">[${now}]</span><span class="log-msg">${message}</span>`;

    els.activityLog.prepend(item);

    // Hapus pesan kosong
    const muted = els.activityLog.querySelector(".muted");
    if (muted) muted.remove();

    // Batasi log
    while (els.activityLog.children.length > CONFIG.SYSTEM.maxLogEntries) {
      els.activityLog.lastChild.remove();
    }
  }

  // Buat daftar tugas dari data yang sama dengan kontrol pompa Wokwi.
  function renderFarmingTasks(data) {
    const threshold = CONFIG.SYSTEM.soilThreshold;
    const soil = data.soil.toFixed(1);
    const tasks = [
      {
        done: true,
        title: "Check soil condition",
        detail: `Live reading received: ${soil}%`,
      },
    ];

    if (data.soil < threshold && data.pump === "ON") {
      tasks.push({
        done: false,
        title: "Water indoor greens",
        detail: `Auto-watering active — below ${threshold}% threshold`,
      });
    } else if (data.soil < threshold) {
      tasks.push({
        done: false,
        title: "Water indoor greens",
        detail: `Soil is dry (${soil}%) but the pump is OFF`,
      });
    } else {
      tasks.push({
        done: true,
        title: "Water indoor greens",
        detail: `Not needed — soil is above ${threshold}%`,
      });
    }

    tasks.push({
      done: false,
      title: "Inspect new leaves",
      detail: "Manual check for pests",
    });

    els.taskList.replaceChildren();
    tasks.forEach((task) => {
      const item = document.createElement("li");
      if (task.done) item.classList.add("done");

      const check = document.createElement("span");
      check.className = "check";
      check.textContent = task.done ? "✓" : "";

      const content = document.createElement("div");
      const title = document.createElement("strong");
      const detail = document.createElement("small");
      title.textContent = task.title;
      detail.textContent = task.detail;

      content.append(title, detail);
      item.append(check, content);
      els.taskList.append(item);
    });
  }

  // Handle State Stale
  function resetStaleTimer() {
    clearTimeout(staleTimer);

    els.devDataStatus.textContent = "Data Terbaru";
    els.devDataStatus.className = "status-fresh";
    els.devQuality.textContent = "Valid";

    staleTimer = setTimeout(() => {
      els.devDataStatus.textContent = "Data Kedaluwarsa";
      els.devDataStatus.className = "status-stale";
      els.devQuality.textContent = "Usang (> 10s)";
      addLog(
        "Peringatan: Tidak menerima data valid selama lebih dari 10 detik.",
      );
    }, CONFIG.SYSTEM.staleTimeout);
  }

  // MQTT Callbacks Configuration
  MqttService.setCallbacks({
    onConnect: () => {
      els.connDot.className = "dot connected";
      els.connText.textContent = "Terhubung";
      els.devConn.textContent = "Terhubung";
      addLog("Sistem berhasil terhubung ke broker MQTT.");
    },

    onDisconnect: () => {
      els.connDot.className = "dot disconnected";
      els.connText.textContent = "Terputus";
      els.devConn.textContent = "Terputus";
      addLog("Koneksi ke broker MQTT terputus. Mencoba ulang...");
    },

    onData: (data) => {
      lastDataTime = Date.now();
      const timeStr = new Date().toLocaleTimeString("id-ID");
      els.devLastMsg.textContent = timeStr;
      resetStaleTimer();

      // Update Soil Moisture
      const soilFormatted = data.soil.toFixed(1);
      els.heroSoilVal.textContent = soilFormatted;
      els.cSoilVal.textContent = soilFormatted;
      els.cSoilProg.style.width = `${Math.min(Math.max(data.soil, 0), 100)}%`;
      els.soilGauge.style.setProperty(
        "--gauge-value",
        Math.min(Math.max(data.soil, 0), 100),
      );

      if (data.soil < CONFIG.SYSTEM.soilThreshold) {
        els.heroSoilStatus.textContent = "Tanah kering, butuh air";
        els.cSoilDesc.textContent = "Ambang kritis tercapai";
      } else {
        els.heroSoilStatus.textContent = "Kondisi tanah ideal";
        els.cSoilDesc.textContent = "Kelembapan aman";
      }

      // Update Environment
      els.cTempVal.textContent = data.temperature.toFixed(1);
      els.cTempDesc.textContent = `Suhu aktual operasional`;
      els.cHumVal.textContent = data.humidity.toFixed(1);

      // Update Pump
      els.cPumpVal.textContent = data.pump;
      if (data.pump !== currentPumpState) {
        if (currentPumpState !== null) {
          // Jangan log saat initial load
          addLog(`Status pompa berubah menjadi: ${data.pump}`);
        }
        currentPumpState = data.pump;

        if (data.pump === "ON") {
          els.pumpCard.classList.add("pump-active");
          els.cPumpDesc.textContent = "Pompa sedang aktif";
        } else {
          els.pumpCard.classList.remove("pump-active");
          els.cPumpDesc.textContent = "Pompa standby";
        }
      }

      renderFarmingTasks(data);

      // Tambahkan titik ke grafik
      ChartManager.addDataPoint(data.soil);
    },

    onStatus: (statusStr) => {
      // Menangani status mentah perangkat misal "Device Online", "ESP Reset", dst
      addLog(`Status Perangkat: ${statusStr}`);
    },

    onError: (errMsg) => {
      els.devQuality.textContent = "Pembacaan Tidak Valid";
      addLog(`Error: ${errMsg}`);
    },
  });

  // Mulai koneksi
  MqttService.connect();
});
