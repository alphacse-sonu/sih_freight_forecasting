"""
Risk & Idle Scenario Management Engine:
- Port Congestion & Turnaround Forecasting
- Bay of Bengal Monsoon & Cyclone Disruption Modeling
- Deadheading & Ballast Minimization Strategies
- Real-time Early Warning Alert Generation
"""

from datetime import datetime
from data.port_specs import INDIAN_EAST_COAST_PORTS

class RiskAndIdleEngine:
    def __init__(self):
        self.ports = INDIAN_EAST_COAST_PORTS

    def get_weather_and_seasonal_risk(self, port_key: str, date: datetime = None):
        """
        Assesses monsoon and cyclone vulnerability for Indian East Coast discharge ports.
        Bay of Bengal is prone to:
        - SW Monsoon (June - September): High swells, siltation in Hooghly/Haldia, Sandheads lighterage shut downs.
        - Post-Monsoon Cyclone Season (October - November): Cyclonic depressions impacting Odisha & AP coasts.
        - Fair Weather Window (December - May): Optimal operations.
        """
        if date is None:
            date = datetime.now()
            
        month = date.month
        port = self.ports.get(port_key, {})
        port_name = port.get("name", port_key)
        
        # Risk scoring 0 to 100
        if 6 <= month <= 9:  # SW Monsoon
            if port_key in ["sagar_sandheads", "haldia"]:
                risk_level = "CRITICAL"
                risk_score = 88
                operational_impact = "Severe river siltation and high offshore swell. Sandheads floating crane lighterage operates at <40% efficiency or faces frequent halts."
            elif port_key in ["paradip", "dhamra", "gopalpur"]:
                risk_level = "HIGH"
                risk_score = 75
                operational_impact = "Heavy rain and swell causing 2-4 days loading/discharge delays. Hatch covers must remain closed during rainfall."
            else:
                risk_level = "MODERATE"
                risk_score = 55
                operational_impact = "Swell impact inside outer harbour. Mechanized conveyor systems operate with minor weather stoppages."
        elif 10 <= month <= 11:  # Cyclone season
            risk_level = "HIGH"
            risk_score = 78
            operational_impact = "Bay of Bengal cyclonic depression watch active. Vessels may be instructed to unberth and proceed to open sea anchorage for safety."
        else:  # Fair weather
            risk_level = "LOW"
            risk_score = 22
            operational_impact = "Fair weather operational window. Minimum weather delays expected (< 12 hours)."
            
        return {
            "port_key": port_key,
            "port_name": port_name,
            "month": month,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "operational_impact": operational_impact,
            "recommended_buffer_days": 3.0 if risk_score > 70 else (1.5 if risk_score > 40 else 0.5)
        }

    def analyze_idle_scenarios(self, vessel_class: str, port_key: str, cargo_volume_mt: float):
        """
        Evaluates vessel turnaround time, waiting time, and deadheading mitigation.
        """
        port = self.ports.get(port_key, self.ports["paradip"])
        discharge_rate = port.get("discharge_rate_tpd_mechanized", 30000)
        discharge_days = cargo_volume_mt / discharge_rate
        waiting_days = port.get("avg_waiting_days", 2.0)
        
        total_port_turnaround_days = discharge_days + waiting_days
        
        # Deadheading & Triangulation Suggestions:
        # Instead of ballasting empty from India back to Australia/US, suggest triangulated backhaul trades:
        # e.g., India East Coast -> China/East Asia with Iron Ore or Bauxite -> Ballast short distance to Australia
        triangulation_options = [
            {
                "trade_lane": "India East Coast (Paradip/Vizag) -> China (Qingdao/Caofeidian)",
                "cargo": "Iron Ore Pellets / Fines (NMDC / OMC)",
                "benefit": "Eliminates empty ballast to Singapore; earns $8.50 - $11.00/MT on backhaul, subsidizing the subsequent laden haul from Australia.",
                "ballast_reduction_pct": 42
            },
            {
                "trade_lane": "India East Coast -> SE Asia (Malaysia/Indonesia)",
                "cargo": "Steel products / Bauxite",
                "benefit": "Reposition vessel directly into Indonesian coal loading belt (Taboneo/Samarinda), eliminating deadheading.",
                "ballast_reduction_pct": 65
            }
        ]
        
        return {
            "vessel_class": vessel_class,
            "port_name": port["name"],
            "discharge_days": round(discharge_days, 1),
            "waiting_days": round(waiting_days, 1),
            "total_turnaround_days": round(total_port_turnaround_days, 1),
            "demurrage_exposure_probability": "HIGH" if waiting_days > 2.5 else "LOW-MODERATE",
            "triangulation_strategies": triangulation_options
        }

    def generate_active_alerts(self, market_pulse: dict):
        """
        Generates situational awareness alerts for logistics directors.
        """
        alerts = []
        macro = market_pulse.get("macro", {})
        indices = market_pulse.get("indices", {})
        
        def extract_val(obj, default=0.0):
            if isinstance(obj, dict):
                return float(obj.get("value", default))
            elif isinstance(obj, (int, float)):
                return float(obj)
            return default

        # 1. Bunker Alert
        bunker_val = extract_val(macro.get("bunker_vlsfo"))
        if bunker_val > 650:
            alerts.append({
                "severity": "WARNING",
                "category": "BUNKER FUEL SPIKE",
                "title": f"VLSFO Bunker Price High (${bunker_val:.1f} / MT)",
                "description": "High bunker costs inflate ton-mile freight by ~14%. Prioritize Capesize bulk economies over smaller Supramax vessels on long-haul routes (e.g. US/Australia).",
                "timestamp": "Active Now"
            })
            
        # 2. BCI Capesize Volatility Alert
        bci = indices.get("bci", {})
        bci_pct = extract_val(bci.get("pct_7d") if isinstance(bci, dict) else 0)
        if bci_pct > 8.0:
            alerts.append({
                "severity": "CRITICAL",
                "category": "FREIGHT VOLATILITY",
                "title": f"Capesize Index Surging (+{bci_pct:.1f}% in 7 days)",
                "description": "Baltic Capesize Index is undergoing an aggressive upward breakout. Spot charter fixtures will experience rapid bid inflation. Lock in 3-voyage coverage immediately.",
                "timestamp": "Updated Today"
            })
            
        # 3. Weather / Monsoon Alert
        monsoon = extract_val(macro.get("monsoon_risk"), 0.3)
        if monsoon > 0.6:
            alerts.append({
                "severity": "CAUTION",
                "category": "BAY OF BENGAL MONSOON",
                "title": "Adverse Weather Swell Window",
                "description": "Sandheads lighterage operations and Haldia channel transit restricted by swell & siltation. Reroute deep-draft parcels to Dhamra or Gangavaram deep berths.",
                "timestamp": "Seasonal Alert"
            })
        else:
            alerts.append({
                "severity": "INFO",
                "category": "OPERATIONAL WINDOW",
                "title": "Optimal Navigation & Berthing Conditions",
                "description": "Favorable sea states and low queueing times reported across Paradip and Gangavaram. High discharge productivity expected.",
                "timestamp": "Current"
            })
            
        # 4. Port Congestion Alert
        congestion = extract_val(macro.get("congestion_index"), 1.0)
        if congestion > 1.25:
            alerts.append({
                "severity": "WARNING",
                "category": "PORT CONGESTION",
                "title": f"Elevated East Coast Port Queues (Index {congestion:.2f})",
                "description": "Coal berths at Paradip experiencing 3.5+ days pre-berthing wait. Ensure charter parties specify reversible laytime or negotiate CQD (Customary Quick Despatch) terms.",
                "timestamp": "Live Status"
            })
            
        return alerts

# Global singleton
risk_engine = RiskAndIdleEngine()
