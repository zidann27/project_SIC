const ChartManager = (() => {
  let chartInstance = null;
  let historyData = []; // [{ timestamp, soil }]
  let currentFilterHours = 1;

  const init = () => {
    const ctx = document.getElementById("soilChart").getContext("2d");
    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Pertumbuhan tanaman",
            data: [],
            backgroundColor: "#62A968",
            borderColor: "#62A968",
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 22,
          },
          {
            label: "Ambang Batas (30%)",
            type: "line",
            data: [],
            borderColor: "#A2BCA1",
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHitRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
            border: { display: false },
            grid: { color: "rgba(27, 94, 32, 0.08)" },
            ticks: { stepSize: 25, color: "#91A291", font: { size: 9 } },
          },
          x: {
            border: { display: false },
            grid: { display: false },
            ticks: { maxTicksLimit: 6, color: "#91A291", font: { size: 9 } },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: { mode: "index", intersect: false },
        },
        interaction: { mode: "nearest", axis: "x", intersect: false },
      },
    });

    // Event listener filter
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".filter-btn")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        currentFilterHours = parseInt(e.target.dataset.hours);
        updateView();
      });
    });
  };

  const addDataPoint = (soilValue) => {
    const now = new Date();
    historyData.push({ timestamp: now, soil: soilValue });
    if (historyData.length > CONFIG.SYSTEM.maxChartPoints) {
      historyData.shift();
    }

    document.getElementById("chart-empty-state").classList.add("hidden");
    updateView();
  };

  const updateView = () => {
    if (!chartInstance) return;

    const cutoff = new Date(Date.now() - currentFilterHours * 60 * 60 * 1000);
    const filtered = historyData.filter((d) => d.timestamp >= cutoff);

    const labels = filtered.map((d) =>
      d.timestamp.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
    const soilVals = filtered.map((d) => d.soil);
    const thresholdVals = filtered.map(() => CONFIG.SYSTEM.soilThreshold);

    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = soilVals;
    chartInstance.data.datasets[1].data = thresholdVals;
    chartInstance.update();
  };

  return { init, addDataPoint };
})();
