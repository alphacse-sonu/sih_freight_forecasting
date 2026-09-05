"""
Vessel Optimizer & Landed Cost Engine:
Evaluates vessel suitability across physical port constraints (Draft, LOA, Beam, TPD discharge rate),
models lighterage / transshipment at Sandheads for Haldia, and computes total delivered cost
per metric ton for SAIL steel plants.
"""

import math
from data.port_specs import INDIAN_EAST_COAST_PORTS, OVERSEAS_LOADING_PORTS
from data.vessel_specs import VESSEL_CLASSES, COMMODITY_SPECS

USD_TO_INR = 87.5  # Approximate exchange rate

class VesselOptimizer:
    def __init__(self):
        self.east_ports = INDIAN_EAST_COAST_PORTS
        self.origin_ports = OVERSEAS_LOADING_PORTS
        self.vessels = VESSEL_CLASSES
        self.commodities = COMMODITY_SPECS

    def evaluate_vessel_for_route(
        self,
        vessel_key: str,
        origin_key: str,
        destination_key: str,
        cargo_volume_mt: float,
        commodity_key: str = "coking_coal",
        bunker_price_usd: float = 580.0,
        current_freight_rate_usd_mt: float = None,
        allow_sandheads_lighterage: bool = True,
        priority_plant: str = None
    ):
        """
        Evaluates a single vessel class for physical feasibility, voyage timeline, and landed cost.
        """
        v_spec = self.vessels[vessel_key]
        o_spec = self.origin_ports[origin_key]
        d_spec = self.east_ports[destination_key]
        
        # Check distance
        dist_nm = o_spec["distances_nm"].get(destination_key, 5000)
        
        # 1. Physical Constraint Validation
        feasibility_status = "FEASIBLE"
        feasibility_reasons = []
        requires_lighterage = False
        lighterage_cost_total = 0.0
        lightened_volume_mt = 0.0
        direct_discharge_volume_mt = cargo_volume_mt
        
        # Loading port check
        if v_spec["typical_draft_m"] > o_spec["max_draft_m"]:
            feasibility_status = "INFEASIBLE"
            feasibility_reasons.append(f"Exceeds origin port ({o_spec['name']}) max draft ({o_spec['max_draft_m']}m vs vessel {v_spec['typical_draft_m']}m)")
            
        # Destination port checks
        # A. Draft check
        if v_spec["typical_draft_m"] > d_spec["max_draft_m"]:
            if destination_key == "haldia" and allow_sandheads_lighterage and v_spec["typical_draft_m"] <= self.east_ports["sagar_sandheads"]["max_draft_m"]:
                # Lighterage possible at Sandheads
                requires_lighterage = True
                # Lighter down to 8.2m to enter Haldia
                # Proportion of cargo lightered: approx 45% for Panamax/Cape, 30% for Supramax
                if vessel_key in ["capesize", "panamax"]:
                    lighter_ratio = 0.50
                else:
                    lighter_ratio = 0.35
                lightened_volume_mt = cargo_volume_mt * lighter_ratio
                direct_discharge_volume_mt = cargo_volume_mt - lightened_volume_mt
                lighterage_rate = self.east_ports["sagar_sandheads"]["lighterage_cost_per_mt_usd"]
                lighterage_cost_total = lightened_volume_mt * lighterage_rate
                feasibility_reasons.append(
                    f"Exceeds direct Haldia draft ({d_spec['max_draft_m']}m). Feasible via two-stage Sandheads lighterage ({lightened_volume_mt:,.0f} MT lightered to barges)."
                )
            else:
                feasibility_status = "INFEASIBLE"
                feasibility_reasons.append(
                    f"Vessel draft ({v_spec['typical_draft_m']}m) exceeds port max draft ({d_spec['max_draft_m']}m) at {d_spec['name']}"
                )
                
        # B. LOA check
        if v_spec["typical_loa_m"] > d_spec["max_loa_m"]:
            feasibility_status = "INFEASIBLE"
            feasibility_reasons.append(f"Vessel LOA ({v_spec['typical_loa_m']}m) exceeds port max LOA ({d_spec['max_loa_m']}m)")
            
        # C. Beam check
        if v_spec["typical_beam_m"] > d_spec["max_beam_m"]:
            feasibility_status = "INFEASIBLE"
            feasibility_reasons.append(f"Vessel Beam ({v_spec['typical_beam_m']}m) exceeds port max Beam ({d_spec['max_beam_m']}m)")
            
        # D. Cargo Parcel capacity check
        # Number of voyages required if parcel > single vessel capacity
        typical_cap = v_spec["typical_capacity_mt"]
        voyages_required = max(1, math.ceil(cargo_volume_mt / typical_cap))
        parcel_per_voyage = cargo_volume_mt / voyages_required
        
        if voyages_required > 1 and cargo_volume_mt <= 85000 and vessel_key == "capesize":
            # Capesize under-utilization penalty
            feasibility_reasons.append("Under-utilization: Parcel volume is too small for standard Capesize full deadweight.")

        # 2. Voyage Timeline Economics
        laden_speed = v_spec["speed_knots_laden"]
        sailing_days_one_way = dist_nm / (laden_speed * 24.0)
        
        # Loading time
        loading_rate = o_spec.get("loading_rate_tpd", 45000)
        loading_days = parcel_per_voyage / loading_rate
        
        # Discharging time
        # Use mechanized rate if available, adjust for Sandheads if lightering
        if requires_lighterage:
            discharge_rate_sh = self.east_ports["sagar_sandheads"]["discharge_rate_mechanized"] if "discharge_rate_mechanized" in self.east_ports["sagar_sandheads"] else 22000
            discharge_days_sh = lightened_volume_mt / discharge_rate_sh
            discharge_rate_haldia = d_spec["discharge_rate_tpd_mechanized"]
            discharge_days_haldia = direct_discharge_volume_mt / discharge_rate_haldia
            discharge_days = discharge_days_sh + discharge_days_haldia + 1.0  # +1 day for river transit
        else:
            discharge_rate = d_spec["discharge_rate_tpd_mechanized"]
            discharge_days = parcel_per_voyage / discharge_rate
            
        waiting_days = d_spec.get("avg_waiting_days", 2.0)
        
        # Total round trip days per voyage (including ballast return)
        ballast_days = dist_nm / (v_spec["speed_knots_ballast"] * 24.0)
        voyage_cycle_days = sailing_days_one_way + loading_days + discharge_days + waiting_days + ballast_days
        single_trip_days = sailing_days_one_way + loading_days + discharge_days + waiting_days
        
        # 3. Cost Breakdown
        # Sea freight baseline ($/MT)
        if current_freight_rate_usd_mt is not None:
            freight_usd_mt = current_freight_rate_usd_mt
        else:
            # Derived from time charter equivalent + bunker
            daily_hire = v_spec["baseline_time_charter_rate_usd_day"]
            fuel_burn_sailing = (sailing_days_one_way + ballast_days) * v_spec["fuel_consumption_laden_tpd"]
            fuel_burn_port = (loading_days + discharge_days + waiting_days) * v_spec["fuel_consumption_port_tpd"]
            total_fuel_cost = (fuel_burn_sailing + fuel_burn_port) * bunker_price_usd
            total_charter_hire = voyage_cycle_days * daily_hire
            freight_usd_mt = (total_charter_hire + total_fuel_cost) / parcel_per_voyage
            
        base_freight_total = freight_usd_mt * cargo_volume_mt
        
        # Port dues & Pilotage (based on vessel GRT approx 0.55 * DWT)
        approx_grt = v_spec["typical_capacity_mt"] * 0.55
        port_tariff_per_voyage = (
            approx_grt * (d_spec["port_dues_per_grt_usd"] + d_spec["pilotage_per_grt_usd"])
            + (discharge_days * d_spec["berth_hire_per_day_usd"])
        )
        port_tariffs_total = port_tariff_per_voyage * voyages_required
        
        # Demurrage Risk calculation
        # Risk of exceeding agreed laytime (normally 5-7 weather working days)
        demurrage_daily_rate = v_spec["demurrage_rate_usd_day"]
        expected_demurrage_days = max(0.0, waiting_days - 1.5)
        demurrage_risk_total = expected_demurrage_days * demurrage_daily_rate * voyages_required
        
        # Inland Rail Freight to SAIL steel plant
        rail_freight_rate = d_spec.get("rail_freight_inland_usd_per_mt", 14.0)
        rail_freight_total = rail_freight_rate * cargo_volume_mt
        
        # Total landed logistics cost
        total_landed_usd = (
            base_freight_total
            + port_tariffs_total
            + lighterage_cost_total
            + demurrage_risk_total
            + rail_freight_total
        )
        
        cost_per_mt_usd = total_landed_usd / cargo_volume_mt
        total_landed_inr_cr = (total_landed_usd * USD_TO_INR) / 10000000.0
        
        return {
            "vessel_key": vessel_key,
            "vessel_class": v_spec["class_name"],
            "feasibility_status": feasibility_status,
            "feasibility_reasons": feasibility_reasons,
            "requires_lighterage": requires_lighterage,
            "lightened_volume_mt": round(lightened_volume_mt, 0),
            "voyages_required": voyages_required,
            "parcel_per_voyage": round(parcel_per_voyage, 0),
            "sailing_days_one_way": round(sailing_days_one_way, 1),
            "loading_days": round(loading_days, 1),
            "discharge_days": round(discharge_days, 1),
            "waiting_days": round(waiting_days, 1),
            "total_voyage_days": round(single_trip_days, 1),
            "freight_rate_usd_mt": round(freight_usd_mt, 2),
            "cost_breakdown_usd": {
                "ocean_freight": round(base_freight_total, 2),
                "port_tariffs": round(port_tariffs_total, 2),
                "lighterage": round(lighterage_cost_total, 2),
                "demurrage_risk": round(demurrage_risk_total, 2),
                "inland_rail_freight": round(rail_freight_total, 2)
            },
            "total_landed_cost_usd": round(total_landed_usd, 2),
            "cost_per_mt_usd": round(cost_per_mt_usd, 2),
            "cost_per_mt_inr": round(cost_per_mt_usd * USD_TO_INR, 2),
            "total_landed_cost_inr_cr": round(total_landed_inr_cr, 2),
            "efficiency_score": 0.0  # Assigned below
        }

    def optimize_vessel_selection(
        self,
        origin_key: str,
        destination_key: str,
        cargo_volume_mt: float,
        commodity_key: str = "coking_coal",
        bunker_price_usd: float = 580.0,
        forecasted_rates: dict = None,
        allow_sandheads_lighterage: bool = True
    ):
        """
        Runs comprehensive evaluation across all vessel classes and ranks them.
        Identifies the globally optimal vessel class for the procurement lot.
        """
        results = []
        for v_key in self.vessels.keys():
            # Check if we have route-specific rate
            custom_rate = None
            if forecasted_rates:
                if v_key == "capesize" and "rate_aus_dhamra_cape" in forecasted_rates:
                    custom_rate = forecasted_rates["rate_aus_dhamra_cape"]
                elif v_key == "panamax" and "rate_aus_paradip_panamax" in forecasted_rates:
                    custom_rate = forecasted_rates["rate_aus_paradip_panamax"]
                elif v_key == "supramax" and "rate_indo_haldia_supramax" in forecasted_rates:
                    custom_rate = forecasted_rates["rate_indo_haldia_supramax"]
                    
            eval_res = self.evaluate_vessel_for_route(
                vessel_key=v_key,
                origin_key=origin_key,
                destination_key=destination_key,
                cargo_volume_mt=cargo_volume_mt,
                commodity_key=commodity_key,
                bunker_price_usd=bunker_price_usd,
                current_freight_rate_usd_mt=custom_rate,
                allow_sandheads_lighterage=allow_sandheads_lighterage
            )
            results.append(eval_res)
            
        # Score and rank feasible vessels
        feasible = [r for r in results if r["feasibility_status"] == "FEASIBLE"]
        
        if feasible:
            min_cost = min(r["cost_per_mt_usd"] for r in feasible)
            for r in feasible:
                # Efficiency score 0-100 (100 is best)
                r["efficiency_score"] = round(100.0 * (min_cost / r["cost_per_mt_usd"]), 1)
            feasible.sort(key=lambda x: x["cost_per_mt_usd"])
            optimal_vessel = feasible[0]
        else:
            optimal_vessel = None

        # Build recommendation narrative
        if optimal_vessel:
            narrative = (
                f"RECOMMENDED VESSEL: {optimal_vessel['vessel_class']}. "
                f"Landed cost is ${optimal_vessel['cost_per_mt_usd']}/MT (₹{optimal_vessel['cost_per_mt_inr']}/MT), "
                f"totaling ₹{optimal_vessel['total_landed_cost_inr_cr']:.2f} Cr for {cargo_volume_mt:,.0f} MT. "
            )
            if optimal_vessel["requires_lighterage"]:
                narrative += "Includes mandatory offshore lighterage at Sandheads to accommodate Haldia's draft restriction. "
            if len(feasible) > 1:
                runner_up = feasible[1]
                savings_vs_runner_up = (runner_up["cost_per_mt_usd"] - optimal_vessel["cost_per_mt_usd"]) * cargo_volume_mt
                savings_cr = (savings_vs_runner_up * USD_TO_INR) / 10000000.0
                narrative += f"Yields net savings of ₹{savings_cr:.2f} Cr (${savings_vs_runner_up:,.0f}) compared to {runner_up['vessel_class']}."
        else:
            narrative = "NO DIRECTLY FEASIBLE VESSEL FOUND. Check port draft and LOA constraints or enable Sandheads lighterage."

        return {
            "origin": self.origin_ports[origin_key],
            "destination": self.east_ports[destination_key],
            "cargo_volume_mt": cargo_volume_mt,
            "commodity": self.commodities[commodity_key],
            "optimal_vessel": optimal_vessel,
            "all_evaluations": results,
            "narrative": narrative
        }

# Global singleton
vessel_optimizer = VesselOptimizer()

if __name__ == "__main__":
    test_run = vessel_optimizer.optimize_vessel_selection(
        origin_key="hay_point",
        destination_key="dhamra",
        cargo_volume_mt=150000,
        commodity_key="coking_coal"
    )
    print("Optimal:", test_run["optimal_vessel"]["vessel_class"])
    print("Narrative:", test_run["narrative"])
