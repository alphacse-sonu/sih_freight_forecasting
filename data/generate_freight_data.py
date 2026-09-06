"""
Generates high-fidelity historical freight rate and macro time series (2018 to 2026).
Reflects historical dry bulk market cycles:
- 2018-2019 pre-COVID baseline
- Early 2020 COVID shock & demand slump
- 2021 post-COVID massive commodities supercycle & container/bulk squeeze (BDI > 5,000)
- 2022-2023 Russia-Ukraine redirection, energy shock & gradual normalization
- 2024-2025 Red Sea diversion impacts, environmental regulations (EEXI/CII), steady coal demand in India
- 2026 current market dynamics
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_historical_freight_dataset(output_path=None):
    if output_path is None:
        output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "freight_timeseries_2018_2026.csv")
    np.random.seed(42)
    start_date = datetime(2018, 1, 1)
    end_date = datetime(2026, 8, 31)
    date_range = pd.date_range(start=start_date, end=end_date, freq='D')
    n_days = len(date_range)
    
    # Days as continuous index for trends
    t = np.linspace(0, n_days / 365.25, n_days)
    
    # Base macro waves
    # 1. 2020 COVID dip (around t ≈ 2.2 to 2.5)
    covid_slump = -0.45 * np.exp(-((t - 2.3) ** 2) / 0.05)
    
    # 2. 2021 Bulk Supercycle peak (around t ≈ 3.7 to 4.0)
    supercycle_2021 = 1.35 * np.exp(-((t - 3.8) ** 2) / 0.15)
    
    # 3. 2022 Ukraine energy crisis & bunker spike (around t ≈ 4.3 to 4.6)
    ukraine_2022 = 0.55 * np.exp(-((t - 4.4) ** 2) / 0.12)
    
    # 4. 2024 Red sea / Cape of Good Hope rerouting ton-mile inflation (around t ≈ 6.2 to 6.8)
    rerouting_2024 = 0.38 * np.exp(-((t - 6.4) ** 2) / 0.25)
    
    # 5. Seasonal variations: Q1 dip (Chinese New Year), Q3 Indian monsoon dip, Q4 year-end restocking surge
    day_of_year = date_range.dayofyear.values
    seasonality = (
        0.18 * np.sin(2 * np.pi * (day_of_year - 80) / 365.25)  # annual cycle
        - 0.12 * np.exp(-((day_of_year - 200) ** 2) / 800)      # Indian monsoon depression (July/Aug)
        + 0.15 * np.exp(-((day_of_year - 330) ** 2) / 900)      # Winter restocking peak
    )
    
    # Random walk component (AR(1))
    noise = np.zeros(n_days)
    for i in range(1, n_days):
        noise[i] = 0.985 * noise[i-1] + np.random.normal(0, 0.035)
        
    combined_index = 1.0 + covid_slump + supercycle_2021 + ukraine_2022 + rerouting_2024 + seasonality + noise
    # Keep positive
    combined_index = np.clip(combined_index, 0.35, 3.8)
    
    # Baltic Dry Index (BDI) baseline ~1400
    bdi = np.round(1450 * combined_index).astype(int)
    # Baltic Capesize Index (BCI) - high volatility
    bci = np.round(1850 * (combined_index ** 1.35) * (1 + 0.08 * np.random.randn(n_days))).astype(int)
    # Baltic Panamax Index (BPI)
    bpi = np.round(1350 * (combined_index ** 1.1) * (1 + 0.05 * np.random.randn(n_days))).astype(int)
    # Baltic Supramax Index (BSI)
    bsi = np.round(1150 * (combined_index ** 0.95) * (1 + 0.04 * np.random.randn(n_days))).astype(int)
    
    # Macro variables
    # VLSFO Bunker ($/MT) Singapore
    bunker_vlsfo = 480 + 220 * (combined_index ** 0.8) + 180 * ukraine_2022 + np.random.normal(0, 15, n_days)
    bunker_vlsfo = np.clip(bunker_vlsfo, 320, 1050).round(1)
    
    # Brent Crude ($/barrel)
    brent = 65 + 35 * (combined_index ** 0.7) + 30 * ukraine_2022 + np.random.normal(0, 2.5, n_days)
    brent = np.clip(brent, 30, 130).round(2)
    
    # Platts Hard Coking Coal ($/MT FOB Australia)
    coking_coal_platts = 180 + 130 * (combined_index ** 1.2) + 160 * ukraine_2022 + np.random.normal(0, 8, n_days)
    coking_coal_platts = np.clip(coking_coal_platts, 110, 520).round(1)
    
    # Iron Ore CFR China 62% Fe ($/MT)
    iron_ore = 95 + 45 * (combined_index ** 0.9) + np.random.normal(0, 4, n_days)
    iron_ore = np.clip(iron_ore, 65, 230).round(1)
    
    # China Steel PMI (index ~50)
    china_steel_pmi = 50.0 + 3.5 * np.sin(2 * np.pi * t) + np.random.normal(0, 1.2, n_days)
    china_steel_pmi = np.clip(china_steel_pmi, 43.0, 58.0).round(1)
    
    # Specific Trade Lane Freight Rates ($/MT delivered to East Coast India)
    # 1. Australia (Hay Point) -> Dhamra/Paradip (Capesize, 150kt parcel)
    rate_aus_dhamra_cape = (10.5 + 8.5 * (bci / 1850) + 0.012 * bunker_vlsfo + np.random.normal(0, 0.4, n_days)).round(2)
    
    # 2. Australia (Hay Point) -> Paradip (Panamax, 75kt parcel)
    rate_aus_paradip_panamax = (13.8 + 9.8 * (bpi / 1350) + 0.015 * bunker_vlsfo + np.random.normal(0, 0.5, n_days)).round(2)
    
    # 3. Indonesia (Taboneo) -> Haldia (Supramax, 55kt parcel)
    rate_indo_haldia_supramax = (9.2 + 6.2 * (bsi / 1150) + 0.009 * bunker_vlsfo + np.random.normal(0, 0.3, n_days)).round(2)
    
    # 4. Indonesia (Taboneo) -> Paradip (Panamax, 75kt parcel)
    rate_indo_paradip_panamax = (8.0 + 5.5 * (bpi / 1350) + 0.008 * bunker_vlsfo + np.random.normal(0, 0.3, n_days)).round(2)
    
    # 5. US East Coast (Hampton Roads) -> Vizag/Gangavaram (Capesize, Cape of Good Hope)
    rate_us_vizag_cape = (24.5 + 16.0 * (bci / 1850) + 0.028 * bunker_vlsfo + np.random.normal(0, 0.7, n_days)).round(2)
    
    # 6. Mozambique (Maputo) -> Gangavaram (Panamax, 75kt parcel)
    rate_moz_gangavaram_panamax = (15.2 + 10.5 * (bpi / 1350) + 0.016 * bunker_vlsfo + np.random.normal(0, 0.5, n_days)).round(2)
    
    # 7. Russia (Taman) -> Paradip (Supramax/Panamax, via Suez)
    rate_rus_paradip_supramax = (21.0 + 13.5 * (bsi / 1150) + 0.022 * bunker_vlsfo + np.random.normal(0, 0.6, n_days)).round(2)
    
    # Port Congestion Index (1.0 = normal, > 1.5 = high congestion / queues)
    congestion_east_coast = (1.0 + 0.25 * (bdi / 1500) + 0.2 * np.sin(2 * np.pi * day_of_year / 365) + np.random.normal(0, 0.08, n_days)).round(2)
    congestion_east_coast = np.clip(congestion_east_coast, 0.6, 2.5)
    
    # Monsoon Risk Factor (0.0 = calm weather, 1.0 = severe monsoon / cyclone risk)
    monsoon_factor = np.zeros(n_days)
    for i, doy in enumerate(day_of_year):
        if 160 <= doy <= 260: # June to mid-September (SW Monsoon)
            monsoon_factor[i] = 0.7 + 0.25 * np.sin(np.pi * (doy - 160) / 100)
        elif 285 <= doy <= 330: # October to late November (Post-monsoon cyclone season)
            monsoon_factor[i] = 0.6 + 0.3 * np.sin(np.pi * (doy - 285) / 45)
        else:
            monsoon_factor[i] = 0.1
    monsoon_factor = np.clip(monsoon_factor + np.random.normal(0, 0.04, n_days), 0.05, 0.98).round(2)
    
    df = pd.DataFrame({
        "date": date_range.strftime('%Y-%m-%d'),
        "bdi": bdi,
        "bci": bci,
        "bpi": bpi,
        "bsi": bsi,
        "bunker_vlsfo_usd_mt": bunker_vlsfo,
        "brent_crude_usd": brent,
        "coking_coal_platts_usd": coking_coal_platts,
        "iron_ore_cfr_china_usd": iron_ore,
        "china_steel_pmi": china_steel_pmi,
        "congestion_index": congestion_east_coast,
        "monsoon_risk_factor": monsoon_factor,
        "rate_aus_dhamra_cape": rate_aus_dhamra_cape,
        "rate_aus_paradip_panamax": rate_aus_paradip_panamax,
        "rate_indo_haldia_supramax": rate_indo_haldia_supramax,
        "rate_indo_paradip_panamax": rate_indo_paradip_panamax,
        "rate_us_vizag_cape": rate_us_vizag_cape,
        "rate_moz_gangavaram_panamax": rate_moz_gangavaram_panamax,
        "rate_rus_paradip_supramax": rate_rus_paradip_supramax
    })
    
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} daily records from {df['date'].iloc[0]} to {df['date'].iloc[-1]} at {output_path}")
    return df

if __name__ == "__main__":
    generate_historical_freight_dataset()
