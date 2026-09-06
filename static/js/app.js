/**
 * SAIL NaviFreight AI - Frontend Controller
 * Handles interactive tabs, real-time market pulse, Chart.js forecasting,
 * charter optimization simulator, port intelligence, and trade lane mapping.
 * 
 * Includes multi-tier data resolution:
 * 1. Live FastAPI Backend (/api/*) when available.
 * 2. Static JSON Assets (static/data/*.json) when hosted statically (e.g. GitHub Pages).
 * 3. In-memory fallback simulation engine when running offline or via file:// protocol.
 */

let forecastChart = null;
let currentHorizonDays = 90;
let lastSimulationData = null;
let leafletMap = null;
let cachedForecasts = null;
let cachedPorts = null;

// ================= FALLBACK DATASETS =================
const FALLBACK_PULSE = {
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    indices: {
        bdi: { value: 1044, change_7d: 48, pct_7d: 4.82 },
        bci: { value: 1320, change_7d: 240, pct_7d: 22.22 },
        bpi: { value: 959, change_7d: 12, pct_7d: 1.27 },
        bsi: { value: 858, change_7d: 4, pct_7d: 0.47 }
    },
    macro: {
        bunker_vlsfo: { value: 628.5, change_7d: 10.5, pct_7d: 1.7 },
        coking_coal: { value: 274.9, change_7d: 17.6, pct_7d: 6.84 },
        brent_crude: { value: 95.28 },
        china_pmi: 47.0,
        congestion_index: 0.93,
        monsoon_risk: 0.79
    }
};

const FALLBACK_ALERTS = [
    {
        severity: "CRITICAL",
        category: "FREIGHT VOLATILITY",
        title: "Capesize Index Surging (+22.2% in 7 days)",
        description: "Baltic Capesize Index is undergoing an aggressive upward breakout. Spot charter fixtures will experience rapid bid inflation. Lock in 3-voyage coverage immediately.",
        timestamp: "Updated Today"
    },
    {
        severity: "CAUTION",
        category: "BAY OF BENGAL MONSOON",
        title: "Adverse Weather Swell Window",
        description: "Sandheads lighterage operations and Haldia channel transit restricted by swell & siltation. Reroute deep-draft parcels to Dhamra or Gangavaram deep berths.",
        timestamp: "Seasonal Alert"
    }
];

const FALLBACK_PORTS = {
    "paradip": {
        name: "Paradip Port (PPA)",
        code: "INPRT",
        state: "Odisha",
        coordinates: [20.2644, 86.6719],
        max_draft_m: 16.0,
        max_loa_m: 260.0,
        max_beam_m: 48.0,
        max_dwt: 125000,
        primary_cargos: ["Coking Coal", "Thermal Coal", "Iron Ore Pellets"],
        discharge_rate_tpd_mechanized: 32000,
        discharge_rate_tpd_conventional: 14000,
        avg_waiting_days: 2.8,
        port_dues_per_grt_usd: 0.42,
        pilotage_per_grt_usd: 0.58,
        berth_hire_per_day_usd: 4200,
        sail_steel_plants: ["Rourkela (RSP)", "Bokaro (BSL)", "Durgapur (DSP)"],
        rail_freight_inland_usd_per_mt: 12.50,
        weather_risk_monsoon: "High (Jun-Sep, Oct-Nov Cyclones)"
    },
    "gangavaram": {
        name: "Gangavaram Port (GPL)",
        code: "INGPR",
        state: "Andhra Pradesh",
        coordinates: [17.6167, 83.2333],
        max_draft_m: 20.2,
        max_loa_m: 330.0,
        max_beam_m: 55.0,
        max_dwt: 200000,
        primary_cargos: ["Coking Coal", "Thermal Coal", "Iron Ore"],
        discharge_rate_tpd_mechanized: 48000,
        discharge_rate_tpd_conventional: 20000,
        avg_waiting_days: 1.2,
        port_dues_per_grt_usd: 0.48,
        pilotage_per_grt_usd: 0.62,
        berth_hire_per_day_usd: 5100,
        sail_steel_plants: ["Bhilai (BSP)", "Rourkela (RSP)", "RINL Vizag"],
        rail_freight_inland_usd_per_mt: 15.80,
        weather_risk_monsoon: "Moderate (All-weather deep-water breakwater)"
    },
    "dhamra": {
        name: "Dhamra Port (DPCL)",
        code: "INDHM",
        state: "Odisha",
        coordinates: [20.8333, 86.9667],
        max_draft_m: 18.0,
        max_loa_m: 320.0,
        max_beam_m: 50.0,
        max_dwt: 180000,
        primary_cargos: ["Coking Coal", "Thermal Coal", "Limestone"],
        discharge_rate_tpd_mechanized: 45000,
        discharge_rate_tpd_conventional: 18000,
        avg_waiting_days: 1.5,
        port_dues_per_grt_usd: 0.45,
        pilotage_per_grt_usd: 0.60,
        berth_hire_per_day_usd: 4800,
        sail_steel_plants: ["Rourkela (RSP)", "Bokaro (BSL)", "IISCO (Burnpur)"],
        rail_freight_inland_usd_per_mt: 13.20,
        weather_risk_monsoon: "Moderate-High (Bay of Bengal swell)"
    },
    "visakhapatnam_outer": {
        name: "Visakhapatnam Outer Harbour (VPT)",
        code: "INVTZ-OH",
        state: "Andhra Pradesh",
        coordinates: [17.6868, 83.2185],
        max_draft_m: 18.1,
        max_loa_m: 300.0,
        max_beam_m: 50.0,
        max_dwt: 200000,
        primary_cargos: ["Coking Coal", "Thermal Coal", "Iron Ore"],
        discharge_rate_tpd_mechanized: 38000,
        discharge_rate_tpd_conventional: 16000,
        avg_waiting_days: 2.1,
        port_dues_per_grt_usd: 0.44,
        pilotage_per_grt_usd: 0.59,
        berth_hire_per_day_usd: 4600,
        sail_steel_plants: ["Bhilai (BSP)", "RINL Vizag", "Rourkela (RSP)"],
        rail_freight_inland_usd_per_mt: 16.50,
        weather_risk_monsoon: "Moderate"
    },
    "haldia": {
        name: "Haldia Dock Complex (HDC)",
        code: "INHAL",
        state: "West Bengal",
        coordinates: [22.0256, 88.0864],
        max_draft_m: 8.5,
        max_loa_m: 230.0,
        max_beam_m: 32.5,
        max_dwt: 55000,
        primary_cargos: ["Coking Coal", "Thermal Coal", "Limestone"],
        discharge_rate_tpd_mechanized: 18000,
        discharge_rate_tpd_conventional: 9000,
        avg_waiting_days: 3.5,
        port_dues_per_grt_usd: 0.46,
        pilotage_per_grt_usd: 0.72,
        berth_hire_per_day_usd: 3900,
        sail_steel_plants: ["Durgapur (DSP)", "IISCO (Burnpur)", "Bokaro (BSL)"],
        rail_freight_inland_usd_per_mt: 8.90,
        weather_risk_monsoon: "Critical (Hugli river siltation & tidal bore)"
    },
    "sagar_sandheads": {
        name: "Sagar Island / Sandheads Lighterage Point",
        code: "INSAG-LGT",
        state: "West Bengal (Offshore Anchorage)",
        coordinates: [21.5000, 88.0500],
        max_draft_m: 19.5,
        max_loa_m: 330.0,
        max_beam_m: 55.0,
        max_dwt: 200000,
        primary_cargos: ["Coking Coal Transshipment to Daughter Barges"],
        discharge_rate_tpd_mechanized: 22000,
        avg_waiting_days: 1.0,
        port_dues_per_grt_usd: 0.20,
        pilotage_per_grt_usd: 0.35,
        berth_hire_per_day_usd: 0,
        lighterage_cost_per_mt_usd: 3.80,
        sail_steel_plants: ["Feeds Haldia Barge Outloading to DSP & Burnpur"],
        rail_freight_inland_usd_per_mt: 8.90,
        weather_risk_monsoon: "High (Open sea anchorage unviable in SW monsoon swell)"
    }
};

// Lifeline safe fetch helper
async function safeFetchJson(url) {
    try {
        const res = await fetch(url);
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        // Ignore network / CORS / 404 errors on static hosts
    }
    return null;
}

// Lifecycle Initialization
document.addEventListener("DOMContentLoaded", () => {
    initMarketPulse();
    fetchAndRenderForecast();
    initPortMatrix();
    // Trigger default simulation on load
    runCharterSimulation();
});

// Tab Switching
function switchTab(tabId) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.add("active");
    
    // Highlight button
    const btns = Array.from(document.querySelectorAll(".tab-btn"));
    const matchingBtn = btns.find(b => b.getAttribute("onclick") && b.getAttribute("onclick").includes(`'${tabId}'`));
    if (matchingBtn) matchingBtn.classList.add("active");

    if (tabId === "routes") {
        if (!leafletMap) {
            setTimeout(initRouteMap, 150);
        } else {
            setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 100);
        }
    }
}

// 1. Fetch Market Pulse & Active Alerts
async function initMarketPulse() {
    let json = await safeFetchJson("/api/market-pulse") || await safeFetchJson("static/data/market_pulse.json");
    if (!json || json.status !== "success") {
        json = { status: "success", pulse: FALLBACK_PULSE, alerts: FALLBACK_ALERTS };
    }

    const pulse = json.pulse;
    const alerts = json.alerts;

    // Current Date
    const curDateEl = document.getElementById("currentDateDisplay");
    const dosDateEl = document.getElementById("dossierDate");
    if (curDateEl) curDateEl.textContent = pulse.date;
    if (dosDateEl) dosDateEl.textContent = pulse.date;

    // Indices
    updateTicker("bdi", pulse.indices.bdi);
    updateTicker("bci", pulse.indices.bci);
    updateTicker("bpi", pulse.indices.bpi);
    updateTicker("bsi", pulse.indices.bsi);

    // Macro
    const bVal = document.getElementById("bunkerVal");
    const bDelta = document.getElementById("bunkerDelta");
    if (bVal) bVal.textContent = `$${pulse.macro.bunker_vlsfo.value} / MT`;
    if (bDelta) bDelta.textContent = formatDeltaText(pulse.macro.bunker_vlsfo.change_7d, pulse.macro.bunker_vlsfo.pct_7d);
    
    const cVal = document.getElementById("coalVal");
    const cDelta = document.getElementById("coalDelta");
    if (cVal) cVal.textContent = `$${pulse.macro.coking_coal.value} / MT`;
    if (cDelta) cDelta.textContent = formatDeltaText(pulse.macro.coking_coal.change_7d, pulse.macro.coking_coal.pct_7d);

    const pmiVal = document.getElementById("pmiVal");
    if (pmiVal) pmiVal.textContent = typeof pulse.macro.china_pmi === 'number' ? pulse.macro.china_pmi.toFixed(1) : pulse.macro.china_pmi;

    const congVal = document.getElementById("congestionVal");
    if (congVal) congVal.textContent = `${Number(pulse.macro.congestion_index).toFixed(2)}x Queue`;
    
    const mRisk = pulse.macro.monsoon_risk;
    const monStatus = document.getElementById("monsoonStatus");
    if (monStatus) monStatus.textContent = mRisk > 0.6 ? "SW Monsoon / Swell Risk" : "Fair Weather Window";

    // Alerts Banner
    renderAlerts(alerts);
}

function updateTicker(key, data) {
    const valEl = document.getElementById(`${key}Val`);
    const deltaEl = document.getElementById(`${key}Delta`);
    if (!valEl || !deltaEl || !data) return;

    valEl.textContent = data.value.toLocaleString();
    const isPos = data.change_7d >= 0;
    deltaEl.className = `ticker-delta ${isPos ? 'delta-pos' : 'delta-neg'}`;
    deltaEl.innerHTML = `${isPos ? '+' : ''}${data.change_7d} (${isPos ? '+' : ''}${data.pct_7d}%)`;
}

function formatDeltaText(chg, pct) {
    const sign = chg >= 0 ? '+' : '';
    return `${sign}${chg} (${sign}${pct}% 7d)`;
}

function renderAlerts(alerts) {
    const container = document.getElementById("alertsContainer");
    if (!container || !alerts) return;
    container.innerHTML = "";

    alerts.forEach(a => {
        const div = document.createElement("div");
        div.className = `alert-banner alert-${a.severity}`;
        div.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div class="alert-content">
                <strong>[${a.category}] ${a.title}:</strong>
                ${a.description}
            </div>
        `;
        container.appendChild(div);
    });
}

// 2. Freight Forecast Studio & Chart.js
function setHorizon(days, btn) {
    currentHorizonDays = days;
    document.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    fetchAndRenderForecast();
}

// Helper to generate mathematical synthetic forecast if static JSON is blocked
function generateSyntheticForecast(target, horizonDays) {
    const baseRates = {
        "rate_aus_dhamra_cape": 24.38,
        "rate_aus_paradip_panamax": 17.50,
        "rate_indo_haldia_supramax": 11.20,
        "rate_indo_paradip_panamax": 12.80,
        "rate_us_vizag_cape": 34.50,
        "rate_moz_gangavaram_panamax": 18.20,
        "rate_rus_paradip_supramax": 29.80,
        "bdi": 1044,
        "bci": 1320,
        "bpi": 959,
        "bsi": 858
    };
    const labels = {
        "rate_aus_dhamra_cape": "Australia (Hay Point) -> Dhamra (Capesize)",
        "rate_aus_paradip_panamax": "Australia (Hay Point) -> Paradip (Panamax)",
        "rate_indo_haldia_supramax": "Indonesia (Taboneo) -> Haldia (Supramax)",
        "rate_indo_paradip_panamax": "Indonesia (Taboneo) -> Paradip (Panamax)",
        "rate_us_vizag_cape": "US East Coast -> Vizag/Gangavaram (Capesize)",
        "rate_moz_gangavaram_panamax": "Mozambique (Maputo) -> Gangavaram (Panamax)",
        "rate_rus_paradip_supramax": "Russia (Taman) -> Paradip (Supramax)",
        "bdi": "Baltic Dry Index (BDI)",
        "bci": "Baltic Capesize Index (BCI)",
        "bpi": "Baltic Panamax Index (BPI)",
        "bsi": "Baltic Supramax Index (BSI)"
    };

    const base = baseRates[target] || 25.0;
    const isIndex = target.startsWith("b");
    const mult = isIndex ? 1.0 : 0.05;

    // Historical 30 points
    const histDates = [];
    const histVals = [];
    const now = new Date();
    for (let i = 30; i >= 1; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        histDates.push(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
        const noise = Math.sin(i * 0.3) * (base * 0.03 * mult);
        histVals.push(Number((base * (1 - (i * 0.002)) + noise).toFixed(2)));
    }

    // Forecast points
    const step = horizonDays <= 90 ? 1 : (horizonDays === 180 ? 2 : 4);
    const fcDates = [];
    const fcVals = [];
    const up80 = [], low80 = [], up95 = [], low95 = [];
    const trendDrift = 0.06; // +6% upward drift

    for (let i = 1; i <= horizonDays; i += step) {
        const d = new Date(now.getTime() + i * 86400000);
        fcDates.push(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
        const progress = i / horizonDays;
        const val = base * (1 + trendDrift * progress) + Math.sin(i * 0.15) * (base * 0.02 * mult);
        const spread80 = val * (0.04 + progress * 0.08);
        const spread95 = val * (0.07 + progress * 0.14);

        fcVals.push(Number(val.toFixed(2)));
        up80.push(Number((val + spread80).toFixed(2)));
        low80.push(Number((val - spread80).toFixed(2)));
        up95.push(Number((val + spread95).toFixed(2)));
        low95.push(Number((val - spread95).toFixed(2)));
    }

    return {
        target: target,
        target_label: labels[target] || target,
        current_rate: base,
        forecast_horizon_days: horizonDays,
        regime: "Bullish Contango Momentum",
        timing_signal: "AGGRESSIVE MULTI-VOYAGE LOCK-IN",
        signal_color: "emerald",
        timing_recommendation: "Forward freight curves indicate strong freight rate escalation over Q3/Q4. Secure multi-voyage or COA coverage immediately.",
        pct_change_90d: 6.8,
        historical_dates: histDates,
        historical_values: histVals,
        forecast_dates: fcDates,
        forecast_values: fcVals,
        lower_80: low80,
        upper_80: up80,
        lower_95: low95,
        upper_95: up95,
        drivers: {
            "China Steel Production & PMI": 0.35,
            "Port Congestion (Iron Ore / Coal)": 0.28,
            "Bunker Fuel Price (VLSFO)": 0.22,
            "Seasonal Monsoon & Swell Factor": 0.15
        }
    };
}

async function fetchAndRenderForecast() {
    const targetSelect = document.getElementById("forecastTargetSelect");
    const target = targetSelect ? targetSelect.value : "rate_aus_dhamra_cape";

    let d = null;
    // 1. Try FastAPI endpoint
    const apiRes = await safeFetchJson(`/api/forecast?target=${target}&horizon_days=${currentHorizonDays}`);
    if (apiRes && apiRes.status === "success" && apiRes.data) {
        d = apiRes.data;
    }

    // 2. Try static JSON asset
    if (!d) {
        if (!cachedForecasts) {
            cachedForecasts = await safeFetchJson("static/data/forecasts.json");
        }
        if (cachedForecasts && cachedForecasts[target] && cachedForecasts[target][String(currentHorizonDays)]) {
            d = cachedForecasts[target][String(currentHorizonDays)];
        }
    }

    // 3. Fallback to client-side generator
    if (!d) {
        d = generateSyntheticForecast(target, currentHorizonDays);
    }

    // Update insight banner
    const tag = document.getElementById("timingSignalTag");
    if (tag) {
        tag.textContent = d.timing_signal;
        if (d.signal_color === "emerald") {
            tag.style.background = "rgba(52, 211, 153, 0.18)";
            tag.style.color = "#34d399";
        } else if (d.signal_color === "amber") {
            tag.style.background = "rgba(251, 191, 36, 0.18)";
            tag.style.color = "#fbbf24";
        } else {
            tag.style.background = "rgba(34, 211, 238, 0.18)";
            tag.style.color = "#22d3ee";
        }
    }

    const regEl = document.getElementById("regimeTitle");
    if (regEl) regEl.textContent = d.regime;

    const narrEl = document.getElementById("timingNarrativeText");
    if (narrEl) narrEl.textContent = d.timing_recommendation;

    const rateEl = document.getElementById("fcCurrentRate");
    if (rateEl) {
        rateEl.textContent = target.startsWith("rate_") ? `$${d.current_rate}/MT` : d.current_rate.toLocaleString();
    }
    
    const sign = d.pct_change_90d >= 0 ? '+' : '';
    const trendEl = document.getElementById("fcTrendPct");
    if (trendEl) {
        trendEl.textContent = `${sign}${d.pct_change_90d}%`;
        trendEl.style.color = d.pct_change_90d >= 0 ? "#fb7185" : "#34d399";
    }

    const titleEl = document.getElementById("chartCanvasTitle");
    if (titleEl) {
        titleEl.textContent = `${d.target_label} — Multi-Horizon Projections (${currentHorizonDays} Days)`;
    }

    // Render Chart & Drivers
    renderChart(d);
    renderDrivers(d.drivers);
}

function renderChart(d) {
    const canvas = document.getElementById("forecastChartCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (forecastChart) {
        forecastChart.destroy();
    }

    const allLabels = [...d.historical_dates, ...d.forecast_dates];
    const histLen = d.historical_dates.length;
    
    // Historical series with null padding for future
    const histData = [...d.historical_values, ...Array(d.forecast_dates.length).fill(null)];
    
    // Forecast series with null padding for past (bridged at last point)
    const fcData = Array(histLen - 1).fill(null);
    fcData.push(d.historical_values[histLen - 1]);
    fcData.push(...d.forecast_values);

    // Confidence Upper & Lower
    const up95 = Array(histLen - 1).fill(null);
    up95.push(d.historical_values[histLen - 1]);
    up95.push(...d.upper_95);

    const low95 = Array(histLen - 1).fill(null);
    low95.push(d.historical_values[histLen - 1]);
    low95.push(...d.lower_95);

    const up80 = Array(histLen - 1).fill(null);
    up80.push(d.historical_values[histLen - 1]);
    up80.push(...d.upper_80);

    const low80 = Array(histLen - 1).fill(null);
    low80.push(d.historical_values[histLen - 1]);
    low80.push(...d.lower_80);

    forecastChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: allLabels,
            datasets: [
                {
                    label: "Historical Rate",
                    data: histData,
                    borderColor: "#3b82f6",
                    backgroundColor: "transparent",
                    borderWidth: 2.5,
                    pointRadius: 0,
                    tension: 0.2
                },
                {
                    label: "AI Point Forecast",
                    data: fcData,
                    borderColor: "#22d3ee",
                    backgroundColor: "transparent",
                    borderWidth: 3,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0.2
                },
                {
                    label: "Upper 80% CI",
                    data: up80,
                    borderColor: "transparent",
                    backgroundColor: "rgba(34, 211, 238, 0.2)",
                    fill: "+1",
                    pointRadius: 0
                },
                {
                    label: "Lower 80% CI",
                    data: low80,
                    borderColor: "transparent",
                    backgroundColor: "transparent",
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: "Upper 95% VaR",
                    data: up95,
                    borderColor: "rgba(99, 102, 241, 0.3)",
                    backgroundColor: "rgba(99, 102, 241, 0.12)",
                    fill: "+1",
                    borderDash: [2, 4],
                    pointRadius: 0
                },
                {
                    label: "Lower 95% VaR",
                    data: low95,
                    borderColor: "rgba(99, 102, 241, 0.3)",
                    backgroundColor: "transparent",
                    fill: false,
                    borderDash: [2, 4],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(10, 17, 40, 0.95)",
                    titleColor: "#22d3ee",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderWidth: 1,
                    padding: 12
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.04)" },
                    ticks: {
                        color: "#94a3b8",
                        maxTicksLimit: 12
                    }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: {
                        color: "#94a3b8"
                    }
                }
            }
        }
    });
}

function renderDrivers(drivers) {
    const container = document.getElementById("driversContainer");
    if (!container || !drivers) return;
    container.innerHTML = "";

    for (const [name, weight] of Object.entries(drivers)) {
        const pct = Math.round(weight * 100);
        const div = document.createElement("div");
        div.className = "driver-row";
        div.innerHTML = `
            <div class="driver-info">
                <span>${name}</span>
                <span class="font-mono text-cyan-400 font-bold">${pct}%</span>
            </div>
            <div class="driver-bar-bg">
                <div class="driver-bar-fill" style="width: ${pct}%"></div>
            </div>
        `;
        container.appendChild(div);
    }
}

// 3. Charter Optimizer & Simulator
const CLIENT_VESSEL_SPECS = {
    capesize: {
        class_name: "Capesize / Baby Cape",
        typical_capacity_mt: 160000,
        typical_draft_m: 18.2,
        typical_loa_m: 290.0,
        typical_beam_m: 45.0,
        speed_knots_laden: 12.5,
        speed_knots_ballast: 13.5,
        fuel_consumption_laden_tpd: 42.0,
        fuel_consumption_port_tpd: 3.5,
        baseline_time_charter_rate_usd_day: 24500,
        demurrage_rate_usd_day: 32000
    },
    panamax: {
        class_name: "Panamax / Kamsarmax",
        typical_capacity_mt: 75000,
        typical_draft_m: 14.2,
        typical_loa_m: 225.0,
        typical_beam_m: 32.2,
        speed_knots_laden: 13.0,
        speed_knots_ballast: 14.0,
        fuel_consumption_laden_tpd: 28.0,
        fuel_consumption_port_tpd: 2.8,
        baseline_time_charter_rate_usd_day: 15800,
        demurrage_rate_usd_day: 22000
    },
    supramax: {
        class_name: "Supramax / Ultramax",
        typical_capacity_mt: 58000,
        typical_draft_m: 12.8,
        typical_loa_m: 190.0,
        typical_beam_m: 32.2,
        speed_knots_laden: 13.5,
        speed_knots_ballast: 14.2,
        fuel_consumption_laden_tpd: 23.0,
        fuel_consumption_port_tpd: 2.5,
        baseline_time_charter_rate_usd_day: 13200,
        demurrage_rate_usd_day: 18000
    },
    handysize: {
        class_name: "Handysize",
        typical_capacity_mt: 35000,
        typical_draft_m: 10.5,
        typical_loa_m: 180.0,
        typical_beam_m: 28.0,
        speed_knots_laden: 13.0,
        speed_knots_ballast: 13.8,
        fuel_consumption_laden_tpd: 18.0,
        fuel_consumption_port_tpd: 2.0,
        baseline_time_charter_rate_usd_day: 10500,
        demurrage_rate_usd_day: 14000
    }
};

const ROUTE_DISTANCES_NM = {
    hay_point: { dhamra: 4850, paradip: 4920, gangavaram: 4780, haldia: 5020 },
    taboneo: { dhamra: 2150, paradip: 2120, gangavaram: 1980, haldia: 2280 },
    hampton_roads: { dhamra: 9550, paradip: 9500, gangavaram: 9450, haldia: 9680 },
    maputo: { dhamra: 4520, paradip: 4480, gangavaram: 4420, haldia: 4640 },
    taman: { dhamra: 5900, paradip: 5850, gangavaram: 5780, haldia: 6020 }
};

const PORT_NAMES = {
    hay_point: "Hay Point / DBCT (Australia)",
    taboneo: "Taboneo (Indonesia)",
    hampton_roads: "Hampton Roads (USA)",
    maputo: "Maputo (Mozambique)",
    taman: "Taman (Russia)",
    dhamra: "Dhamra Port (DPCL)",
    paradip: "Paradip Port (PPA)",
    gangavaram: "Gangavaram Port (GPL)",
    haldia: "Haldia Dock Complex (HDC)"
};

// Client-side charter simulation fallback
function simulateCharterClientSide(payload) {
    const USD_TO_INR = 87.5;
    const originKey = payload.origin;
    const destKey = payload.destination;
    const volume = payload.cargo_volume_mt;
    const bunker = payload.bunker_price_usd;
    const allowSh = payload.allow_sandheads_lighterage;

    const destPort = (FALLBACK_PORTS[destKey] || FALLBACK_PORTS["dhamra"]);
    const distNm = (ROUTE_DISTANCES_NM[originKey] && ROUTE_DISTANCES_NM[originKey][destKey]) || 4850;

    const evals = [];

    for (const [vKey, v] of Object.entries(CLIENT_VESSEL_SPECS)) {
        let feasibility = "FEASIBLE";
        let requiresLighterage = false;
        let lightenedVol = 0;
        let directVol = volume;
        let lighterageCost = 0;

        // Draft check
        if (v.typical_draft_m > destPort.max_draft_m) {
            if (destKey === "haldia" && allowSh && v.typical_draft_m <= 19.5) {
                requiresLighterage = true;
                const ratio = (vKey === "capesize" || vKey === "panamax") ? 0.50 : 0.35;
                lightenedVol = volume * ratio;
                directVol = volume - lightenedVol;
                lighterageCost = lightenedVol * 3.80;
            } else {
                feasibility = "INFEASIBLE";
            }
        }

        const voyages = Math.max(1, Math.ceil(volume / v.typical_capacity_mt));
        const parcelPerVoyage = volume / voyages;

        const sailingDays = distNm / (v.speed_knots_laden * 24.0);
        const ballastDays = distNm / (v.speed_knots_ballast * 24.0);
        const loadingDays = parcelPerVoyage / 45000;
        
        let dischargeDays = 0;
        if (requiresLighterage) {
            dischargeDays = (lightenedVol / 22000) + (directVol / (destPort.discharge_rate_tpd_mechanized || 18000)) + 1.0;
        } else {
            dischargeDays = parcelPerVoyage / (destPort.discharge_rate_tpd_mechanized || 35000);
        }
        const waitDays = destPort.avg_waiting_days || 2.0;
        const totalTripDays = sailingDays + loadingDays + dischargeDays + waitDays;
        const roundTripDays = totalTripDays + ballastDays;

        // Fuel and hire
        const fuelBurn = (sailingDays + ballastDays) * v.fuel_consumption_laden_tpd + (loadingDays + dischargeDays + waitDays) * v.fuel_consumption_port_tpd;
        const fuelCost = fuelBurn * bunker;
        const hireCost = roundTripDays * v.baseline_time_charter_rate_usd_day;
        const freightUsdMt = (fuelCost + hireCost) / parcelPerVoyage;
        const baseFreight = freightUsdMt * volume;

        const approxGrt = v.typical_capacity_mt * 0.55;
        const portTariffVoyage = (approxGrt * ((destPort.port_dues_per_grt_usd || 0.45) + (destPort.pilotage_per_grt_usd || 0.60))) + (dischargeDays * (destPort.berth_hire_per_day_usd || 4500));
        const portTariffs = portTariffVoyage * voyages;

        const demurrageDays = Math.max(0, waitDays - 1.5);
        const demurrageRisk = demurrageDays * v.demurrage_rate_usd_day * voyages;

        const railFreight = (destPort.rail_freight_inland_usd_per_mt || 13.0) * volume;

        const totalLandedUsd = baseFreight + portTariffs + lighterageCost + demurrageRisk + railFreight;
        const costPerMtUsd = totalLandedUsd / volume;
        const costPerMtInr = costPerMtUsd * USD_TO_INR;
        const totalInrCr = (totalLandedUsd * USD_TO_INR) / 10000000;

        evals.push({
            vessel_key: vKey,
            vessel_class: v.class_name,
            feasibility_status: feasibility,
            requires_lighterage: requiresLighterage,
            lightened_volume_mt: Math.round(lightenedVol),
            voyages_required: voyages,
            parcel_per_voyage: Math.round(parcelPerVoyage),
            sailing_days_one_way: Number(sailingDays.toFixed(1)),
            loading_days: Number(loadingDays.toFixed(1)),
            discharge_days: Number(dischargeDays.toFixed(1)),
            waiting_days: Number(waitDays.toFixed(1)),
            total_voyage_days: Number(totalTripDays.toFixed(1)),
            cost_per_mt_usd: Number(costPerMtUsd.toFixed(2)),
            cost_per_mt_inr: Math.round(costPerMtInr),
            total_landed_cost_inr_cr: Number(totalInrCr.toFixed(2)),
            cost_breakdown_usd: {
                ocean_freight: Math.round(baseFreight),
                port_tariffs: Math.round(portTariffs),
                lighterage: Math.round(lighterageCost),
                demurrage_risk: Math.round(demurrageRisk),
                inland_rail_freight: Math.round(railFreight)
            },
            efficiency_score: 0
        });
    }

    // Rank feasible
    const feasible = evals.filter(e => e.feasibility_status === "FEASIBLE");
    let best = evals[0];
    if (feasible.length > 0) {
        const minCost = Math.min(...feasible.map(e => e.cost_per_mt_usd));
        feasible.forEach(e => {
            e.efficiency_score = Math.round(100.0 * (minCost / e.cost_per_mt_usd));
        });
        feasible.sort((a, b) => a.cost_per_mt_usd - b.cost_per_mt_usd);
        best = feasible[0];
    }

    // Contract Strategy Evaluator
    const spotFreight = best.cost_breakdown_usd.ocean_freight / volume;
    const spotTotalCr = (best.cost_breakdown_usd.ocean_freight * USD_TO_INR) / 10000000;
    const shortFreight = spotFreight * 0.94;
    const shortTotalCr = spotTotalCr * 0.94;
    const coaFreight = spotFreight * 0.89;
    const coaTotalCr = spotTotalCr * 0.89;

    const shortSavings = spotTotalCr - shortTotalCr;
    const coaSavings = spotTotalCr - coaTotalCr;

    return {
        status: "success",
        optimization: {
            origin: { name: PORT_NAMES[originKey] || originKey },
            destination: { name: destPort.name },
            commodity: { name: "Prime Hard Coking Coal" },
            optimal_vessel: best,
            all_evaluations: evals,
            narrative: `Physical compliance confirms ${destPort.name}'s draft (${destPort.max_draft_m}m) supports ${best.vessel_class} operations. Mechanized discharge (${destPort.discharge_rate_tpd_mechanized?.toLocaleString()} TPD) delivers optimal logistics economics.`
        },
        contract_strategy: {
            recommended_strategy: "MEDIUM_TERM_COA",
            rationale_headline: "Contract of Affreightment (COA) Delivers Maximum Arbitrage vs Spot Volatility",
            rationale_detail: "With market indicators trending higher, forward index hedging via 6-month COA locks in unit ocean freight at substantial savings with fixed bunker escalation clauses.",
            strategies: {
                spot: {
                    freight_rate_usd_mt: Number(spotFreight.toFixed(2)),
                    total_freight_inr_cr: Number(spotTotalCr.toFixed(2)),
                    var_95_total_inr_cr: Number((spotTotalCr * 1.15).toFixed(2)),
                    risk_level: "HIGH EXPOSURE"
                },
                short_term_multi: {
                    freight_rate_usd_mt: Number(shortFreight.toFixed(2)),
                    total_freight_inr_cr: Number(shortTotalCr.toFixed(2)),
                    savings_vs_spot_inr_cr: Number(shortSavings.toFixed(2)),
                    savings_pct: 6.0,
                    risk_level: "MODERATE BUFFER"
                },
                medium_term_coa: {
                    freight_rate_usd_mt: Number(coaFreight.toFixed(2)),
                    total_freight_inr_cr: Number(coaTotalCr.toFixed(2)),
                    savings_vs_spot_inr_cr: Number(coaSavings.toFixed(2)),
                    savings_pct: 11.0,
                    risk_level: "HEDGED STABILITY"
                }
            }
        }
    };
}

async function runCharterSimulation(e) {
    if (e) e.preventDefault();

    const originEl = document.getElementById("simOrigin");
    const destEl = document.getElementById("simDestination");
    const volEl = document.getElementById("simVolume");
    const commEl = document.getElementById("simCommodity");
    const bunkerEl = document.getElementById("simBunker");
    const horizonEl = document.getElementById("simHorizon");
    const lighterageEl = document.getElementById("simLighterage");

    const origin = originEl ? originEl.value : "hay_point";
    const destination = destEl ? destEl.value : "dhamra";
    const volume = parseFloat(volEl ? volEl.value : 150000) || 150000;
    const commodity = commEl ? commEl.value : "coking_coal";
    const bunker = parseFloat(bunkerEl ? bunkerEl.value : 580) || 580;
    const horizon = parseInt(horizonEl ? horizonEl.value : 6) || 6;
    const lighterage = lighterageEl ? lighterageEl.checked : true;

    const payload = {
        origin: origin,
        destination: destination,
        cargo_volume_mt: volume,
        commodity: commodity,
        bunker_price_usd: bunker,
        horizon_months: horizon,
        allow_sandheads_lighterage: lighterage
    };

    let json = null;
    try {
        const res = await fetch("/api/optimize-charter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.status === "success") {
                json = data;
            }
        }
    } catch (err) {
        // Fallback to client-side simulator
    }

    if (!json) {
        json = simulateCharterClientSide(payload);
    }

    lastSimulationData = json;
    renderSimulationResults(json);
    syncDossier(json);
}

function renderSimulationResults(data) {
    const opt = data.optimization;
    const best = opt.optimal_vessel;
    const cs = data.contract_strategy;
    const strat = cs.strategies;

    if (best) {
        const optVName = document.getElementById("optVesselName");
        const optUCost = document.getElementById("optUnitCost");
        const optUCostINR = document.getElementById("optUnitCostINR");
        const optNarr = document.getElementById("optNarrativeText");
        const kcVoy = document.getElementById("kcVoyages");
        const kcDays = document.getElementById("kcDays");
        const kcDraft = document.getElementById("kcDraft");
        const kcTotal = document.getElementById("kcTotalINR");

        if (optVName) optVName.textContent = best.vessel_class;
        if (optUCost) optUCost.innerHTML = `$${best.cost_per_mt_usd.toFixed(2)} <span class="text-sm font-normal text-slate-300">/ MT</span>`;
        if (optUCostINR) optUCostINR.textContent = `₹${best.cost_per_mt_inr.toLocaleString()} / MT`;
        if (optNarr) optNarr.textContent = opt.narrative;

        if (kcVoy) kcVoy.textContent = `${best.voyages_required} Voyage${best.voyages_required > 1 ? 's' : ''}`;
        if (kcDays) kcDays.textContent = `${best.total_voyage_days} Days`;
        if (kcDraft) kcDraft.textContent = best.requires_lighterage ? "Lightened at Sandheads" : "Safe Port Berth";
        if (kcTotal) kcTotal.textContent = `₹${best.total_landed_cost_inr_cr.toFixed(2)} Cr`;
    }

    // Contract Strategy Evaluator
    const badge = document.getElementById("recStrategyBadge");
    const headline = document.getElementById("ccHeadline");
    const detail = document.getElementById("ccDetail");

    if (badge) badge.textContent = `RECOMMENDED: ${cs.recommended_strategy.replace(/_/g, ' ')}`;
    if (headline) headline.textContent = cs.rationale_headline;
    if (detail) detail.textContent = cs.rationale_detail;

    // Spot Card
    const spotR = document.getElementById("spotRateDisplay");
    const spotT = document.getElementById("spotTotalDisplay");
    const spotV = document.getElementById("spotVarDisplay");
    if (spotR) spotR.innerHTML = `$${strat.spot.freight_rate_usd_mt.toFixed(2)} <span class="text-xs text-slate-400">/ MT</span>`;
    if (spotT) spotT.textContent = `₹${strat.spot.total_freight_inr_cr.toFixed(2)} Cr Total`;
    if (spotV) spotV.textContent = `₹${strat.spot.var_95_total_inr_cr.toFixed(2)} Cr`;

    // Short-Term Multi-Voyage Card
    const shortR = document.getElementById("shortRateDisplay");
    const shortT = document.getElementById("shortTotalDisplay");
    const shortS = document.getElementById("shortSavingsDisplay");
    if (shortR) shortR.innerHTML = `$${strat.short_term_multi.freight_rate_usd_mt.toFixed(2)} <span class="text-xs text-slate-400">/ MT</span>`;
    if (shortT) shortT.textContent = `₹${strat.short_term_multi.total_freight_inr_cr.toFixed(2)} Cr Total`;
    if (shortS) shortS.textContent = `₹${strat.short_term_multi.savings_vs_spot_inr_cr.toFixed(2)} Cr (${strat.short_term_multi.savings_pct}%)`;

    // Medium-Term COA Card
    const coaR = document.getElementById("coaRateDisplay");
    const coaT = document.getElementById("coaTotalDisplay");
    const coaS = document.getElementById("coaSavingsDisplay");
    if (coaR) coaR.innerHTML = `$${strat.medium_term_coa.freight_rate_usd_mt.toFixed(2)} <span class="text-xs text-slate-400">/ MT</span>`;
    if (coaT) coaT.textContent = `₹${strat.medium_term_coa.total_freight_inr_cr.toFixed(2)} Cr Total`;
    if (coaS) coaS.textContent = `₹${strat.medium_term_coa.savings_vs_spot_inr_cr.toFixed(2)} Cr (${strat.medium_term_coa.savings_pct}%)`;

    // Feasibility Checklist Table
    const tbody = document.getElementById("feasibilityTableBody");
    if (tbody) {
        tbody.innerHTML = "";
        opt.all_evaluations.forEach(ev => {
            const tr = document.createElement("tr");
            const isFeasible = ev.feasibility_status === "FEASIBLE";
            tr.innerHTML = `
                <td><strong>${ev.vessel_class}</strong></td>
                <td class="font-mono text-xs">${ev.parcel_per_voyage.toLocaleString()} MT</td>
                <td>${isFeasible ? '<span class="text-emerald-400">Pass</span>' : '<span class="text-rose-400">Draft Limit</span>'}</td>
                <td><span class="text-emerald-400">Pass</span></td>
                <td>
                    <span class="${isFeasible ? 'badge-emerald' : 'badge-red'}">
                        ${ev.feasibility_status}
                    </span>
                    ${ev.requires_lighterage ? '<span class="badge-amber ml-1">Lightered</span>' : ''}
                </td>
                <td class="font-mono font-bold ${isFeasible ? 'text-white' : 'text-slate-500'}">
                    $${ev.cost_per_mt_usd.toFixed(2)}/MT
                </td>
                <td>
                    ${isFeasible ? `<span class="badge-accent">${ev.efficiency_score}%</span>` : '<span class="text-slate-500">N/A</span>'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Cost Breakdown List
    const cb = best ? best.cost_breakdown_usd : {};
    const costList = document.getElementById("costBreakdownList");
    if (costList) {
        costList.innerHTML = `
            <div class="bl-row"><span>Base Ocean Freight:</span> <strong class="font-mono text-cyan-400">$${cb.ocean_freight?.toLocaleString()}</strong></div>
            <div class="bl-row"><span>Port Tariffs, Pilotage & Berth Hire:</span> <strong class="font-mono text-white">$${cb.port_tariffs?.toLocaleString()}</strong></div>
            <div class="bl-row"><span>Offshore Lighterage (Sandheads):</span> <strong class="font-mono text-amber-300">$${cb.lighterage?.toLocaleString() || 0}</strong></div>
            <div class="bl-row"><span>Demurrage Risk Exposure:</span> <strong class="font-mono text-rose-400">$${cb.demurrage_risk?.toLocaleString()}</strong></div>
            <div class="bl-row"><span>Inland Rail Freight to Steel Plant:</span> <strong class="font-mono text-blue-300">$${cb.inland_rail_freight?.toLocaleString()}</strong></div>
        `;
    }

    // Timeline Steps
    const timeList = document.getElementById("voyageTimelineList");
    if (timeList && best) {
        timeList.innerHTML = `
            <div class="ts-row">
                <div class="ts-circle">1</div>
                <div><strong>Sailing Transit:</strong> ${best.sailing_days_one_way} days laden passage</div>
            </div>
            <div class="ts-row">
                <div class="ts-circle">2</div>
                <div><strong>Loading at Origin:</strong> ${best.loading_days} days high-speed berth ops</div>
            </div>
            <div class="ts-row">
                <div class="ts-circle">3</div>
                <div><strong>Pre-Berthing Wait:</strong> ${best.waiting_days} days queue buffer</div>
            </div>
            <div class="ts-row">
                <div class="ts-circle">4</div>
                <div><strong>Discharge & Rail Outload:</strong> ${best.discharge_days} days turnaround</div>
            </div>
        `;
    }
}

// 4. Port Intelligence Matrix Tab
async function initPortMatrix() {
    let json = await safeFetchJson("/api/ports") || await safeFetchJson("static/data/ports.json");
    let ports = (json && json.east_coast_ports) ? json.east_coast_ports : FALLBACK_PORTS;

    const grid = document.getElementById("portsGrid");
    if (!grid) return;

    grid.innerHTML = "";
    for (const [key, p] of Object.entries(ports)) {
        const card = document.createElement("div");
        card.className = "port-card glass-card";
        card.innerHTML = `
            <div>
                <div class="port-header">
                    <div class="port-name">${p.name}</div>
                    <span class="port-code">${p.code}</span>
                </div>
                <div class="port-specs-list">
                    <div class="ps-item"><span>State:</span> <span>${p.state}</span></div>
                    <div class="ps-item"><span>Max Permissible Draft:</span> <strong>${p.max_draft_m} m</strong></div>
                    <div class="ps-item"><span>Max LOA / Beam:</span> <span>${p.max_loa_m}m / ${p.max_beam_m}m</span></div>
                    <div class="ps-item"><span>Mechanized Discharge:</span> <strong>${p.discharge_rate_tpd_mechanized?.toLocaleString()} TPD</strong></div>
                    <div class="ps-item"><span>Avg Queueing Wait:</span> <span>${p.avg_waiting_days} Days</span></div>
                    <div class="ps-item"><span>Monsoon Sensitivity:</span> <span>${p.weather_risk_monsoon}</span></div>
                </div>
            </div>
            <div>
                <div class="port-plants">
                    <i class="fa-solid fa-industry"></i> <strong>Feeds:</strong> ${p.sail_steel_plants?.join(", ")}
                </div>
            </div>
        `;
        grid.appendChild(card);
    }
}

// 5. Leaflet Trade Lane Route Map
function initRouteMap() {
    const mapDiv = document.getElementById("routeMap");
    if (!mapDiv || leafletMap) return;

    try {
        leafletMap = L.map('routeMap').setView([12.0, 85.0], 3);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 10
        }).addTo(leafletMap);

        // Origins
        const origins = [
            { name: "Hay Point / DBCT (Australia)", coords: [-21.28, 149.30], color: "#22d3ee" },
            { name: "Taboneo (Indonesia)", coords: [-3.75, 114.45], color: "#34d399" },
            { name: "Hampton Roads (USA)", coords: [36.95, -76.33], color: "#fb7185" },
            { name: "Maputo (Mozambique)", coords: [-25.96, 32.58], color: "#fbbf24" },
            { name: "Taman (Russia)", coords: [45.13, 36.68], color: "#818cf8" }
        ];

        // Destinations (India East Coast)
        const destinations = [
            { name: "Dhamra Port", coords: [20.83, 86.96] },
            { name: "Paradip Port", coords: [20.26, 86.67] },
            { name: "Gangavaram Port", coords: [17.61, 83.23] },
            { name: "Haldia Dock Complex", coords: [22.02, 88.08] }
        ];

        // Plot destination markers
        destinations.forEach(d => {
            L.circleMarker(d.coords, {
                radius: 7,
                fillColor: "#f43f5e",
                color: "#ffffff",
                weight: 1.5,
                fillOpacity: 0.9
            }).addTo(leafletMap).bindPopup(`<b>Discharge Hub:</b> ${d.name}`);
        });

        // Plot origin markers & sea route lines
        origins.forEach(o => {
            L.circleMarker(o.coords, {
                radius: 6,
                fillColor: o.color,
                color: "#ffffff",
                weight: 1.5,
                fillOpacity: 0.9
            }).addTo(leafletMap).bindPopup(`<b>Loading Port:</b> ${o.name}`);

            // Draw curved trade lane polyline to Dhamra
            const line = [o.coords, [20.83, 86.96]];
            L.polyline(line, {
                color: o.color,
                weight: 2.2,
                opacity: 0.65,
                dashArray: '4, 8'
            }).addTo(leafletMap);
        });
    } catch (e) {
        console.warn("Leaflet map initialization error:", e);
    }
}

// 6. Procurement Committee Dossier Synchronization
function syncDossier(data) {
    const opt = data.optimization;
    const best = opt.optimal_vessel;
    const cs = data.contract_strategy;
    const strat = cs.strategies;

    const dComm = document.getElementById("dosCommodity");
    const dRoute = document.getElementById("dosRoute");
    const dVess = document.getElementById("dosVessel");
    const dSav = document.getElementById("dosSavings");
    const dNarr = document.getElementById("dosPortNarrative");

    if (dComm) dComm.textContent = opt.commodity.name;
    if (dRoute) dRoute.textContent = `${opt.origin.name} -> ${opt.destination.name}`;
    if (dVess) dVess.textContent = `${best.vessel_class} (${best.parcel_per_voyage.toLocaleString()} MT/Voyage)`;
    if (dSav) dSav.textContent = `₹${strat.medium_term_coa.savings_vs_spot_inr_cr.toFixed(2)} Crores (${strat.medium_term_coa.savings_pct}%)`;
    if (dNarr) dNarr.textContent = opt.narrative;

    const tbody = document.getElementById("dosContractTableBody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td><strong>Single Spot Fixtures (Status Quo)</strong></td>
                <td class="font-mono">$${strat.spot.freight_rate_usd_mt.toFixed(2)}</td>
                <td class="font-mono">₹${strat.spot.total_freight_inr_cr.toFixed(2)} Cr</td>
                <td>Baseline (0%)</td>
                <td><span class="badge-red">${strat.spot.risk_level}</span></td>
            </tr>
            <tr>
                <td><strong>Short-Term Multi-Voyage (3–6 Voyages)</strong></td>
                <td class="font-mono text-cyan-400">$${strat.short_term_multi.freight_rate_usd_mt.toFixed(2)}</td>
                <td class="font-mono">₹${strat.short_term_multi.total_freight_inr_cr.toFixed(2)} Cr</td>
                <td class="text-emerald-400 font-bold">-₹${strat.short_term_multi.savings_vs_spot_inr_cr.toFixed(2)} Cr (${strat.short_term_multi.savings_pct}%)</td>
                <td><span class="badge-blue">${strat.short_term_multi.risk_level}</span></td>
            </tr>
            <tr class="bg-emerald-50">
                <td><strong>Medium-Term COA (Recommended)</strong></td>
                <td class="font-mono text-emerald-600 font-bold">$${strat.medium_term_coa.freight_rate_usd_mt.toFixed(2)}</td>
                <td class="font-mono text-emerald-600 font-bold">₹${strat.medium_term_coa.total_freight_inr_cr.toFixed(2)} Cr</td>
                <td class="text-emerald-600 font-bold">-₹${strat.medium_term_coa.savings_vs_spot_inr_cr.toFixed(2)} Cr (${strat.medium_term_coa.savings_pct}%)</td>
                <td><span class="badge-emerald">${strat.medium_term_coa.risk_level}</span></td>
            </tr>
        `;
    }
}

function exportDossierJSON() {
    if (!lastSimulationData) {
        alert("Please run a charter simulation first!");
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lastSimulationData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `SAIL_Charter_Optimization_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchor.click();
}
