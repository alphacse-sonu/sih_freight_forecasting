"""
Port infrastructure specifications for Indian East Coast ports and key overseas loading hubs.
Used by the Vessel Optimizer, Demurrage Estimator, and Lighterage Advisor.
"""

INDIAN_EAST_COAST_PORTS = {
    "paradip": {
        "name": "Paradip Port (PPA)",
        "code": "INPRT",
        "state": "Odisha",
        "coordinates": [20.2644, 86.6719],
        "max_draft_m": 16.0,  # 14.5m standard, up to 16.0m at deep mechanized coal berths with tide
        "max_loa_m": 260.0,
        "max_beam_m": 48.0,
        "max_dwt": 125000,
        "primary_cargos": ["Coking Coal", "Thermal Coal", "Iron Ore Pellets", "Flux/Limestone"],
        "discharge_rate_tpd_mechanized": 32000,
        "discharge_rate_tpd_conventional": 14000,
        "avg_waiting_days": 2.8,
        "port_dues_per_grt_usd": 0.42,
        "pilotage_per_grt_usd": 0.58,
        "berth_hire_per_day_usd": 4200,
        "lighterage_available": False,
        "sail_steel_plants": ["Rourkela (RSP)", "Bokaro (BSL)", "Durgapur (DSP)"],
        "rail_freight_inland_usd_per_mt": 12.50,
        "weather_risk_monsoon": "High (Jun-Sep, Oct-Nov Cyclones)",
        "notes": "Mechanized coal berth can handle up to Baby Cape/Kamsarmax. Congestion common during post-monsoon coal restocking."
    },
    "gangavaram": {
        "name": "Gangavaram Port (GPL)",
        "code": "INGPR",
        "state": "Andhra Pradesh",
        "coordinates": [17.6167, 83.2333],
        "max_draft_m": 20.2,  # Deepest all-weather port on East Coast
        "max_loa_m": 330.0,
        "max_beam_m": 55.0,
        "max_dwt": 200000,
        "primary_cargos": ["Coking Coal", "Thermal Coal", "Iron Ore", "Bauxite"],
        "discharge_rate_tpd_mechanized": 48000,
        "discharge_rate_tpd_conventional": 20000,
        "avg_waiting_days": 1.2,
        "port_dues_per_grt_usd": 0.48,
        "pilotage_per_grt_usd": 0.62,
        "berth_hire_per_day_usd": 5100,
        "lighterage_available": False,
        "sail_steel_plants": ["Bhilai (BSP)", "Rourkela (RSP)", "RINL Vizag"],
        "rail_freight_inland_usd_per_mt": 15.80,
        "weather_risk_monsoon": "Moderate (All-weather deep-water breakwater)",
        "notes": "Optimal for fully laden standard Capesize vessels (150kt-180kt). High discharge rates minimize demurrage."
    },
    "dhamra": {
        "name": "Dhamra Port (DPCL)",
        "code": "INDHM",
        "state": "Odisha",
        "coordinates": [20.8333, 86.9667],
        "max_draft_m": 18.0,
        "max_loa_m": 320.0,
        "max_beam_m": 50.0,
        "max_dwt": 180000,
        "primary_cargos": ["Coking Coal", "Thermal Coal", "Limestone"],
        "discharge_rate_tpd_mechanized": 45000,
        "discharge_rate_tpd_conventional": 18000,
        "avg_waiting_days": 1.5,
        "port_dues_per_grt_usd": 0.45,
        "pilotage_per_grt_usd": 0.60,
        "berth_hire_per_day_usd": 4800,
        "lighterage_available": True,
        "sail_steel_plants": ["Rourkela (RSP)", "Bokaro (BSL)", "IISCO (Burnpur)"],
        "rail_freight_inland_usd_per_mt": 13.20,
        "weather_risk_monsoon": "Moderate-High (Bay of Bengal swell)",
        "notes": "Can handle full Capesize. Often used for partial discharge / lightering before ships proceed to Haldia."
    },
    "visakhapatnam_outer": {
        "name": "Visakhapatnam Outer Harbour (VPT)",
        "code": "INVTZ-OH",
        "state": "Andhra Pradesh",
        "coordinates": [17.6868, 83.2185],
        "max_draft_m": 18.1,
        "max_loa_m": 300.0,
        "max_beam_m": 50.0,
        "max_dwt": 200000,
        "primary_cargos": ["Coking Coal", "Thermal Coal", "Iron Ore"],
        "discharge_rate_tpd_mechanized": 38000,
        "discharge_rate_tpd_conventional": 16000,
        "avg_waiting_days": 2.1,
        "port_dues_per_grt_usd": 0.44,
        "pilotage_per_grt_usd": 0.59,
        "berth_hire_per_day_usd": 4600,
        "lighterage_available": False,
        "sail_steel_plants": ["Bhilai (BSP)", "RINL Vizag", "Rourkela (RSP)"],
        "rail_freight_inland_usd_per_mt": 16.50,
        "weather_risk_monsoon": "Moderate",
        "notes": "Excellent deep-draft facility for Cape/Panamax. Well connected to South-Central & East Coast rail grid."
    },
    "visakhapatnam_inner": {
        "name": "Visakhapatnam Inner Harbour (VPT)",
        "code": "INVTZ-IH",
        "state": "Andhra Pradesh",
        "coordinates": [17.6950, 83.2950],
        "max_draft_m": 14.5,
        "max_loa_m": 230.0,
        "max_beam_m": 32.5,
        "max_dwt": 85000,
        "primary_cargos": ["Met Coal", "Limestone", "General Bulk"],
        "discharge_rate_tpd_mechanized": 22000,
        "discharge_rate_tpd_conventional": 12000,
        "avg_waiting_days": 2.5,
        "port_dues_per_grt_usd": 0.40,
        "pilotage_per_grt_usd": 0.55,
        "berth_hire_per_day_usd": 3800,
        "lighterage_available": False,
        "sail_steel_plants": ["Bhilai (BSP)", "Rourkela (RSP)"],
        "rail_freight_inland_usd_per_mt": 16.50,
        "weather_risk_monsoon": "Low (Sheltered harbour)",
        "notes": "Restricted by entrance channel width; limited to Panamax/Supramax."
    },
    "gopalpur": {
        "name": "Gopalpur Port (GPL)",
        "code": "INGOP",
        "state": "Odisha",
        "coordinates": [19.2600, 84.9100],
        "max_draft_m": 14.0,
        "max_loa_m": 225.0,
        "max_beam_m": 33.0,
        "max_dwt": 75000,
        "primary_cargos": ["Coking Coal", "Thermal Coal", "Ilmenite"],
        "discharge_rate_tpd_mechanized": 18000,
        "discharge_rate_tpd_conventional": 10000,
        "avg_waiting_days": 1.8,
        "port_dues_per_grt_usd": 0.38,
        "pilotage_per_grt_usd": 0.52,
        "berth_hire_per_day_usd": 3400,
        "lighterage_available": False,
        "sail_steel_plants": ["Rourkela (RSP)", "Bhilai (BSP)"],
        "rail_freight_inland_usd_per_mt": 14.00,
        "weather_risk_monsoon": "High (Open sea anchorage prone to swells)",
        "notes": "Handy/Supramax/Panamax; good secondary alternative when Paradip experiences high queueing."
    },
    "haldia": {
        "name": "Haldia Dock Complex (HDC)",
        "code": "INHAL",
        "state": "West Bengal",
        "coordinates": [22.0238, 88.0805],
        "max_draft_m": 8.5,  # Riverine draft restriction (governed by Hooghly sandbars, avg 7.5m - 8.5m)
        "max_loa_m": 220.0,
        "max_beam_m": 32.2,  # Lock entrance restriction
        "max_dwt": 55000,
        "primary_cargos": ["Coking Coal", "Thermal Coal", "Limestone"],
        "discharge_rate_tpd_mechanized": 14000,
        "discharge_rate_tpd_conventional": 9000,
        "avg_waiting_days": 3.4,
        "port_dues_per_grt_usd": 0.52,
        "pilotage_per_grt_usd": 0.72,  # River pilotage from Sagar Roads is expensive
        "berth_hire_per_day_usd": 3600,
        "lighterage_available": True,
        "sail_steel_plants": ["Durgapur (DSP)", "IISCO (Burnpur)", "Bokaro (BSL)"],
        "rail_freight_inland_usd_per_mt": 8.20,  # Closest to Durgapur and Burnpur steel plants!
        "weather_risk_monsoon": "High (Severe river siltation and bores during monsoon)",
        "notes": "Crucial for Bengal-Jharkhand steel belt due to lower rail freight, but severe draft bottleneck requires Sandheads lighterage for vessels > 35k MT."
    },
    "sagar_sandheads": {
        "name": "Sagar / Sandheads Anchorage",
        "code": "INSAG",
        "state": "West Bengal",
        "coordinates": [21.5000, 88.0500],
        "max_draft_m": 18.0,
        "max_loa_m": 330.0,
        "max_beam_m": 55.0,
        "max_dwt": 180000,
        "primary_cargos": ["Coking Coal Transshipment", "Thermal Coal Lighterage"],
        "discharge_rate_tpd_mechanized": 24000,  # Transhipper crane / floating crane
        "discharge_rate_tpd_conventional": 12000,
        "avg_waiting_days": 2.0,
        "port_dues_per_grt_usd": 0.20,
        "pilotage_per_grt_usd": 0.30,
        "berth_hire_per_day_usd": 0,  # Offshore anchorage
        "lighterage_available": True,
        "lighterage_cost_per_mt_usd": 7.50,  # Lightering / barge transfer cost
        "sail_steel_plants": ["Durgapur (DSP)", "IISCO (Burnpur) via Haldia"],
        "rail_freight_inland_usd_per_mt": 8.20,  # From Haldia discharge
        "weather_risk_monsoon": "Severe (Anchorage shut during rough swell Jun-Aug)",
        "notes": "Dedicated lighterage anchorage. Mother Capesize/Panamax unloads 40%-60% cargo to daughter barges before entering Haldia."
    }
}

OVERSEAS_LOADING_PORTS = {
    "hay_point": {
        "name": "Hay Point / DBCT",
        "country": "Australia",
        "region": "Queensland",
        "coordinates": [-21.2833, 149.3000],
        "max_draft_m": 19.5,
        "max_dwt": 220000,
        "cargos": ["Premium Hard Coking Coal", "PCI Coal"],
        "loading_rate_tpd": 65000,
        "distances_nm": {
            "paradip": 5210,
            "gangavaram": 5120,
            "dhamra": 5240,
            "visakhapatnam_outer": 5110,
            "visakhapatnam_inner": 5110,
            "gopalpur": 5170,
            "haldia": 5350,
            "sagar_sandheads": 5290
        }
    },
    "gladstone": {
        "name": "Gladstone (RG Tanna)",
        "country": "Australia",
        "region": "Queensland",
        "coordinates": [-23.8400, 151.2600],
        "max_draft_m": 17.5,
        "max_dwt": 180000,
        "cargos": ["Semi-Soft Coking Coal", "Thermal Coal"],
        "loading_rate_tpd": 55000,
        "distances_nm": {
            "paradip": 5380,
            "gangavaram": 5290,
            "dhamra": 5410,
            "visakhapatnam_outer": 5280,
            "visakhapatnam_inner": 5280,
            "gopalpur": 5340,
            "haldia": 5520,
            "sagar_sandheads": 5460
        }
    },
    "hampton_roads": {
        "name": "Hampton Roads (Norfolk/Newport News)",
        "country": "United States",
        "region": "US East Coast",
        "coordinates": [36.9500, -76.3300],
        "max_draft_m": 15.2,
        "max_dwt": 130000,
        "cargos": ["High-Vol / Low-Vol Met Coal"],
        "loading_rate_tpd": 40000,
        "distances_nm": {  # Via Cape of Good Hope
            "paradip": 9850,
            "gangavaram": 9780,
            "dhamra": 9890,
            "visakhapatnam_outer": 9770,
            "visakhapatnam_inner": 9770,
            "gopalpur": 9810,
            "haldia": 9980,
            "sagar_sandheads": 9920
        }
    },
    "taboneo": {
        "name": "Taboneo Anchorage / Banjarmasin",
        "country": "Indonesia",
        "region": "South Kalimantan",
        "coordinates": [-3.7500, 114.4500],
        "max_draft_m": 16.0,
        "max_dwt": 85000,
        "cargos": ["Thermal Coal", "PCI Coal"],
        "loading_rate_tpd": 25000,
        "distances_nm": {
            "paradip": 2420,
            "gangavaram": 2350,
            "dhamra": 2450,
            "visakhapatnam_outer": 2340,
            "visakhapatnam_inner": 2340,
            "gopalpur": 2390,
            "haldia": 2540,
            "sagar_sandheads": 2480
        }
    },
    "maputo": {
        "name": "Maputo (Matola Coal Terminal)",
        "country": "Mozambique",
        "region": "East Africa",
        "coordinates": [-25.9667, 32.5833],
        "max_draft_m": 14.5,
        "max_dwt": 85000,
        "cargos": ["Moatize Coking Coal", "Thermal Coal"],
        "loading_rate_tpd": 28000,
        "distances_nm": {
            "paradip": 4350,
            "gangavaram": 4270,
            "dhamra": 4390,
            "visakhapatnam_outer": 4260,
            "visakhapatnam_inner": 4260,
            "gopalpur": 4310,
            "haldia": 4480,
            "sagar_sandheads": 4420
        }
    },
    "taman": {
        "name": "Taman Seaport",
        "country": "Russia",
        "region": "Black Sea",
        "coordinates": [45.1300, 36.6800],
        "max_draft_m": 18.5,
        "max_dwt": 180000,
        "cargos": ["PCI Coal", "Anthracite", "Met Coal"],
        "loading_rate_tpd": 45000,
        "distances_nm": {  # Via Suez Canal
            "paradip": 6120,
            "gangavaram": 6050,
            "dhamra": 6160,
            "visakhapatnam_outer": 6040,
            "visakhapatnam_inner": 6040,
            "gopalpur": 6080,
            "haldia": 6250,
            "sagar_sandheads": 6190
        }
    }
}
