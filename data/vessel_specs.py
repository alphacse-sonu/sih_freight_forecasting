"""
Vessel specifications, operational costs, fuel consumption, and charter rate baselines.
Used by the Vessel Optimizer and Fleet Economics engine.
"""

VESSEL_CLASSES = {
    "handysize": {
        "class_name": "Handysize",
        "description": "Geared bulk carrier, highly flexible, suitable for shallow ports like Haldia",
        "dwt_min": 25000,
        "dwt_max": 39999,
        "typical_capacity_mt": 35000,
        "typical_draft_m": 10.2,
        "typical_loa_m": 178.0,
        "typical_beam_m": 28.0,
        "speed_knots_laden": 12.5,
        "speed_knots_ballast": 13.5,
        "fuel_consumption_laden_tpd": 20.0,
        "fuel_consumption_ballast_tpd": 17.0,
        "fuel_consumption_port_tpd": 2.5,
        "is_geared": True,
        "cranes_and_grabs": "4 x 30 MT cranes + 10-12 cbm grabs",
        "baseline_time_charter_rate_usd_day": 12500,
        "demurrage_rate_usd_day": 14000,
        "despatch_rate_usd_day": 7000,
        "canal_transits": ["Suez", "Panama"],
        "cape_accessible": True
    },
    "supramax": {
        "class_name": "Supramax / Ultramax",
        "description": "Geared workhorse, optimal for regional Asian trades (Indonesia to Paradip/Haldia with lightering)",
        "dwt_min": 50000,
        "dwt_max": 64999,
        "typical_capacity_mt": 58000,
        "typical_draft_m": 12.8,
        "typical_loa_m": 199.9,
        "typical_beam_m": 32.26,
        "speed_knots_laden": 13.0,
        "speed_knots_ballast": 14.0,
        "fuel_consumption_laden_tpd": 25.0,
        "fuel_consumption_ballast_tpd": 21.0,
        "fuel_consumption_port_tpd": 3.2,
        "is_geared": True,
        "cranes_and_grabs": "4 x 35 MT cranes + 12-14 cbm grabs",
        "baseline_time_charter_rate_usd_day": 15800,
        "demurrage_rate_usd_day": 18000,
        "despatch_rate_usd_day": 9000,
        "canal_transits": ["Suez", "Panama"],
        "cape_accessible": True
    },
    "panamax": {
        "class_name": "Panamax / Kamsarmax",
        "description": "Gearless high-efficiency bulk carrier, standard for Australian/Mozambique coal to Paradip & Vizag",
        "dwt_min": 70000,
        "dwt_max": 84999,
        "typical_capacity_mt": 75000,
        "typical_draft_m": 14.4,
        "typical_loa_m": 229.0,
        "typical_beam_m": 32.26,
        "speed_knots_laden": 13.5,
        "speed_knots_ballast": 14.5,
        "fuel_consumption_laden_tpd": 30.0,
        "fuel_consumption_ballast_tpd": 25.0,
        "fuel_consumption_port_tpd": 2.2,
        "is_geared": False,
        "cranes_and_grabs": "Gearless (Requires shore discharge cranes/unloaders)",
        "baseline_time_charter_rate_usd_day": 18500,
        "demurrage_rate_usd_day": 22000,
        "despatch_rate_usd_day": 11000,
        "canal_transits": ["Suez", "Panama"],
        "cape_accessible": True
    },
    "capesize": {
        "class_name": "Capesize / Baby Cape",
        "description": "Very large ore/coal carrier, maximum economy of scale, fits deepwater ports (Gangavaram, Dhamra, Vizag Outer)",
        "dwt_min": 115000,
        "dwt_max": 185000,
        "typical_capacity_mt": 160000,
        "typical_draft_m": 17.8,
        "typical_loa_m": 292.0,
        "typical_beam_m": 45.0,
        "speed_knots_laden": 14.0,
        "speed_knots_ballast": 15.0,
        "fuel_consumption_laden_tpd": 46.0,
        "fuel_consumption_ballast_tpd": 38.0,
        "fuel_consumption_port_tpd": 3.0,
        "is_geared": False,
        "cranes_and_grabs": "Gearless (Requires high-capacity mechanized unloaders)",
        "baseline_time_charter_rate_usd_day": 26500,
        "demurrage_rate_usd_day": 32000,
        "despatch_rate_usd_day": 16000,
        "canal_transits": ["Suez (laden/ballast)", "Panama (restricted/Neopanamax only)"],
        "cape_accessible": True
    }
}

COMMODITY_SPECS = {
    "coking_coal": {
        "name": "Hard Coking Coal (HCC)",
        "stowage_factor_cbm_mt": 1.25,
        "moisture_pct": 9.5,
        "typical_origins": ["hay_point", "gladstone", "hampton_roads", "maputo"],
        "benchmark_price_usd_mt": 245.0,
        "monthly_sail_requirement_mt": 950000
    },
    "thermal_coal": {
        "name": "Thermal / Non-Coking Coal",
        "stowage_factor_cbm_mt": 1.35,
        "moisture_pct": 14.0,
        "typical_origins": ["taboneo", "gladstone", "maputo"],
        "benchmark_price_usd_mt": 92.0,
        "monthly_sail_requirement_mt": 400000
    },
    "pci_coal": {
        "name": "Pulverized Coal Injection (PCI)",
        "stowage_factor_cbm_mt": 1.28,
        "moisture_pct": 10.0,
        "typical_origins": ["hay_point", "taman", "taboneo"],
        "benchmark_price_usd_mt": 175.0,
        "monthly_sail_requirement_mt": 300000
    },
    "limestone_flux": {
        "name": "Limestone / Flux",
        "stowage_factor_cbm_mt": 0.85,
        "moisture_pct": 2.0,
        "typical_origins": ["maputo", "gladstone"],
        "benchmark_price_usd_mt": 38.0,
        "monthly_sail_requirement_mt": 200000
    }
}
