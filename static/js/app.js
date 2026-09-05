/**
 * SAIL NaviFreight AI - Frontend Controller
 * Handles interactive tabs, real-time market pulse, Chart.js forecasting,
 * charter optimization simulator, port intelligence, and trade lane mapping.
 */

let forecastChart = null;
let currentHorizonDays = 90;
let lastSimulationData = null;
let leafletMap = null;

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
    const matchingBtn = btns.find(b => b.getAttribute("onclick").includes(`'${tabId}'`));
    if (matchingBtn) matchingBtn.classList.add("active");

    if (tabId === "routes" && !leafletMap) {
        setTimeout(initRouteMap, 150);
    }
}

// 1. Fetch Market Pulse & Active Alerts
async function initMarketPulse() {
    try {
        const res = await fetch("/api/market-pulse");
        const json = await res.json();
        if (json.status !== "success") return;

        const pulse = json.pulse;
        const alerts = json.alerts;

        // Current Date
        document.getElementById("currentDateDisplay").textContent = pulse.date;
        document.getElementById("dossierDate").textContent = pulse.date;

        // Indices
        updateTicker("bdi", pulse.indices.bdi);
        updateTicker("bci", pulse.indices.bci);
        updateTicker("bpi", pulse.indices.bpi);
        updateTicker("bsi", pulse.indices.bsi);

        // Macro
        document.getElementById("bunkerVal").textContent = `$${pulse.macro.bunker_vlsfo.value} / MT`;
        document.getElementById("bunkerDelta").textContent = formatDeltaText(pulse.macro.bunker_vlsfo.change_7d, pulse.macro.bunker_vlsfo.pct_7d);
        
        document.getElementById("coalVal").textContent = `$${pulse.macro.coking_coal.value} / MT`;
        document.getElementById("coalDelta").textContent = formatDeltaText(pulse.macro.coking_coal.change_7d, pulse.macro.coking_coal.pct_7d);

        document.getElementById("pmiVal").textContent = pulse.macro.china_pmi.toFixed(1);
        document.getElementById("congestionVal").textContent = `${pulse.macro.congestion_index.toFixed(2)}x Queue`;
        
        const mRisk = pulse.macro.monsoon_risk;
        document.getElementById("monsoonStatus").textContent = mRisk > 0.6 ? "SW Monsoon / Swell Risk" : "Fair Weather Window";

        // Alerts Banner
        renderAlerts(alerts);
    } catch (e) {
        console.error("Failed to load market pulse:", e);
    }
}

function updateTicker(key, data) {
    const valEl = document.getElementById(`${key}Val`);
    const deltaEl = document.getElementById(`${key}Delta`);
    if (!valEl || !deltaEl) return;

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
    if (!container) return;
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
    btn.classList.add("active");
    fetchAndRenderForecast();
}

async function fetchAndRenderForecast() {
    const target = document.getElementById("forecastTargetSelect").value;
    try {
        const res = await fetch(`/api/forecast?target=${target}&horizon_days=${currentHorizonDays}`);
        const json = await res.json();
        if (json.status !== "success") return;

        const d = json.data;

        // Update insight banner
        const tag = document.getElementById("timingSignalTag");
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

        document.getElementById("regimeTitle").textContent = d.regime;
        document.getElementById("timingNarrativeText").textContent = d.timing_recommendation;
        document.getElementById("fcCurrentRate").textContent = target.startsWith("rate_") ? `$${d.current_rate}/MT` : d.current_rate.toLocaleString();
        
        const sign = d.pct_change_90d >= 0 ? '+' : '';
        const trendEl = document.getElementById("fcTrendPct");
        trendEl.textContent = `${sign}${d.pct_change_90d}%`;
        trendEl.style.color = d.pct_change_90d >= 0 ? "#fb7185" : "#34d399";

        document.getElementById("chartCanvasTitle").textContent = `${d.target_label} — Multi-Horizon Projections (${currentHorizonDays} Days)`;

        // Render Chart
        renderChart(d);

        // Render Drivers
        renderDrivers(d.drivers);
    } catch (e) {
        console.error("Forecast render error:", e);
    }
}

function renderChart(d) {
    const ctx = document.getElementById("forecastChartCanvas").getContext("2d");
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
    if (!container) return;
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
async function runCharterSimulation(e) {
    if (e) e.preventDefault();

    const origin = document.getElementById("simOrigin").value;
    const destination = document.getElementById("simDestination").value;
    const volume = parseFloat(document.getElementById("simVolume").value) || 150000;
    const commodity = document.getElementById("simCommodity").value;
    const bunker = parseFloat(document.getElementById("simBunker").value) || 580;
    const horizon = parseInt(document.getElementById("simHorizon").value) || 6;
    const lighterage = document.getElementById("simLighterage").checked;

    try {
        const payload = {
            origin: origin,
            destination: destination,
            cargo_volume_mt: volume,
            commodity: commodity,
            bunker_price_usd: bunker,
            horizon_months: horizon,
            allow_sandheads_lighterage: lighterage
        };

        const res = await fetch("/api/optimize-charter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (json.status !== "success") {
            alert("Simulation error: " + json.message);
            return;
        }

        lastSimulationData = json;
        renderSimulationResults(json);
        syncDossier(json);
    } catch (err) {
        console.error("Simulation run error:", err);
    }
}

function renderSimulationResults(data) {
    const opt = data.optimization;
    const best = opt.optimal_vessel;
    const cs = data.contract_strategy;
    const strat = cs.strategies;

    if (best) {
        document.getElementById("optVesselName").textContent = best.vessel_class;
        document.getElementById("optUnitCost").innerHTML = `$${best.cost_per_mt_usd.toFixed(2)} <span class="text-sm font-normal text-slate-300">/ MT</span>`;
        document.getElementById("optUnitCostINR").textContent = `₹${best.cost_per_mt_inr.toLocaleString()} / MT`;
        document.getElementById("optNarrativeText").textContent = opt.narrative;

        document.getElementById("kcVoyages").textContent = `${best.voyages_required} Voyage${best.voyages_required > 1 ? 's' : ''}`;
        document.getElementById("kcDays").textContent = `${best.total_voyage_days} Days`;
        document.getElementById("kcDraft").textContent = best.requires_lighterage ? "Lightened at Sandheads" : "Safe Port Berth";
        document.getElementById("kcTotalINR").textContent = `₹${best.total_landed_cost_inr_cr.toFixed(2)} Cr`;
    }

    // Contract Strategy Evaluator
    document.getElementById("recStrategyBadge").textContent = `RECOMMENDED: ${cs.recommended_strategy.replace(/_/g, ' ')}`;
    document.getElementById("ccHeadline").textContent = cs.rationale_headline;
    document.getElementById("ccDetail").textContent = cs.rationale_detail;

    // Spot Card
    document.getElementById("spotRateDisplay").innerHTML = `$${strat.spot.freight_rate_usd_mt.toFixed(2)} <span class="text-xs text-slate-400">/ MT</span>`;
    document.getElementById("spotTotalDisplay").textContent = `₹${strat.spot.total_freight_inr_cr.toFixed(2)} Cr Total`;
    document.getElementById("spotVarDisplay").textContent = `₹${strat.spot.var_95_total_inr_cr.toFixed(2)} Cr`;

    // Short-Term Multi-Voyage Card
    document.getElementById("shortRateDisplay").innerHTML = `$${strat.short_term_multi.freight_rate_usd_mt.toFixed(2)} <span class="text-xs text-slate-400">/ MT</span>`;
    document.getElementById("shortTotalDisplay").textContent = `₹${strat.short_term_multi.total_freight_inr_cr.toFixed(2)} Cr Total`;
    document.getElementById("shortSavingsDisplay").textContent = `₹${strat.short_term_multi.savings_vs_spot_inr_cr.toFixed(2)} Cr (${strat.short_term_multi.savings_pct}%)`;

    // Medium-Term COA Card
    document.getElementById("coaRateDisplay").innerHTML = `$${strat.medium_term_coa.freight_rate_usd_mt.toFixed(2)} <span class="text-xs text-slate-400">/ MT</span>`;
    document.getElementById("coaTotalDisplay").textContent = `₹${strat.medium_term_coa.total_freight_inr_cr.toFixed(2)} Cr Total`;
    document.getElementById("coaSavingsDisplay").textContent = `₹${strat.medium_term_coa.savings_vs_spot_inr_cr.toFixed(2)} Cr (${strat.medium_term_coa.savings_pct}%)`;

    // Feasibility Checklist Table
    const tbody = document.getElementById("feasibilityTableBody");
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

    // Cost Breakdown List
    const cb = best ? best.cost_breakdown_usd : {};
    const costList = document.getElementById("costBreakdownList");
    costList.innerHTML = `
        <div class="bl-row"><span>Base Ocean Freight:</span> <strong class="font-mono text-cyan-400">$${cb.ocean_freight?.toLocaleString()}</strong></div>
        <div class="bl-row"><span>Port Tariffs, Pilotage & Berth Hire:</span> <strong class="font-mono text-white">$${cb.port_tariffs?.toLocaleString()}</strong></div>
        <div class="bl-row"><span>Offshore Lighterage (Sandheads):</span> <strong class="font-mono text-amber-300">$${cb.lighterage?.toLocaleString() || 0}</strong></div>
        <div class="bl-row"><span>Demurrage Risk Exposure:</span> <strong class="font-mono text-rose-400">$${cb.demurrage_risk?.toLocaleString()}</strong></div>
        <div class="bl-row"><span>Inland Rail Freight to Steel Plant:</span> <strong class="font-mono text-blue-300">$${cb.inland_rail_freight?.toLocaleString()}</strong></div>
    `;

    // Timeline Steps
    const timeList = document.getElementById("voyageTimelineList");
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

// 4. Port Intelligence Matrix Tab
async function initPortMatrix() {
    try {
        const res = await fetch("/api/ports");
        const json = await res.json();
        const ports = json.east_coast_ports;
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
    } catch (e) {
        console.error("Ports load error:", e);
    }
}

// 5. Leaflet Trade Lane Route Map
function initRouteMap() {
    const mapDiv = document.getElementById("routeMap");
    if (!mapDiv) return;

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
}

// 6. Procurement Committee Dossier Synchronization
function syncDossier(data) {
    const opt = data.optimization;
    const best = opt.optimal_vessel;
    const cs = data.contract_strategy;
    const strat = cs.strategies;

    document.getElementById("dosCommodity").textContent = opt.commodity.name;
    document.getElementById("dosRoute").textContent = `${opt.origin.name} -> ${opt.destination.name}`;
    document.getElementById("dosVessel").textContent = `${best.vessel_class} (${best.parcel_per_voyage.toLocaleString()} MT/Voyage)`;
    document.getElementById("dosSavings").textContent = `₹${strat.medium_term_coa.savings_vs_spot_inr_cr.toFixed(2)} Crores (${strat.medium_term_coa.savings_pct}%)`;

    document.getElementById("dosPortNarrative").textContent = opt.narrative;

    const tbody = document.getElementById("dosContractTableBody");
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
