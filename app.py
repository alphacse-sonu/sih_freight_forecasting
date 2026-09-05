"""
FastAPI Server for SIH Problem Statement 26006:
SAIL NaviFreight AI - Intelligent Freight Forecasting & Vessel Chartering Optimization System
Ministry of Steel / Steel Authority of India Limited (SAIL)
"""

from fastapi import FastAPI, Request, Query
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import os

from models.forecasting_engine import forecaster
from optimizer.vessel_optimizer import vessel_optimizer
from optimizer.contract_advisor import contract_advisor
from risk_engine.risk_engine import risk_engine
from data.port_specs import INDIAN_EAST_COAST_PORTS, OVERSEAS_LOADING_PORTS
from data.vessel_specs import VESSEL_CLASSES, COMMODITY_SPECS

app = FastAPI(
    title="SAIL NaviFreight AI - Intelligent Freight Forecasting & Vessel Chartering System",
    description="SIH 2026 Problem Statement 26006 | Ministry of Steel / SAIL",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

base_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(base_dir, "static")
templates_dir = os.path.join(base_dir, "templates")

app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)

# Initialize models on startup
@app.on_event("startup")
def startup_event():
    print("Pre-training freight forecasting models...")
    forecaster.train_models()
    print("Forecasting models ready.")

class CharterSimRequest(BaseModel):
    origin: str
    destination: str
    cargo_volume_mt: float
    commodity: Optional[str] = "coking_coal"
    bunker_price_usd: Optional[float] = 580.0
    horizon_months: Optional[int] = 6
    allow_sandheads_lighterage: Optional[bool] = True

from fastapi.responses import HTMLResponse

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    index_file = os.path.join(templates_dir, "index.html")
    with open(index_file, "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)

@app.get("/api/market-pulse")
def get_market_pulse():
    pulse = forecaster.get_market_pulse()
    alerts = risk_engine.generate_active_alerts(pulse)
    return {
        "status": "success",
        "pulse": pulse,
        "alerts": alerts
    }

@app.get("/api/forecast")
def get_forecast(
    target: str = Query("rate_aus_dhamra_cape", description="Target freight rate or index"),
    horizon_days: int = Query(90, description="Forecast horizon in days (30, 90, 180, 365)")
):
    try:
        res = forecaster.forecast(target_col=target, horizon_days=horizon_days)
        return {"status": "success", "data": res}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/optimize-charter")
def optimize_charter(payload: CharterSimRequest):
    try:
        # 1. Run multi-vessel physical and landed cost optimization
        opt_res = vessel_optimizer.optimize_vessel_selection(
            origin_key=payload.origin,
            destination_key=payload.destination,
            cargo_volume_mt=payload.cargo_volume_mt,
            commodity_key=payload.commodity,
            bunker_price_usd=payload.bunker_price_usd,
            allow_sandheads_lighterage=payload.allow_sandheads_lighterage
        )
        
        optimal_vessel = opt_res["optimal_vessel"]
        
        # 2. Get forecast trend to feed into contract strategy advisor
        # Map route to forecast target
        target_map = {
            ("hay_point", "dhamra"): "rate_aus_dhamra_cape",
            ("hay_point", "paradip"): "rate_aus_paradip_panamax",
            ("taboneo", "haldia"): "rate_indo_haldia_supramax",
            ("taboneo", "paradip"): "rate_indo_paradip_panamax",
            ("hampton_roads", "gangavaram"): "rate_us_vizag_cape",
            ("maputo", "gangavaram"): "rate_moz_gangavaram_panamax",
            ("taman", "paradip"): "rate_rus_paradip_supramax"
        }
        target_key = target_map.get((payload.origin, payload.destination), "bdi")
        fc_res = forecaster.forecast(target_col=target_key, horizon_days=payload.horizon_months * 30)
        
        # 3. Run Contract Strategy Advisor (Spot vs Multi-Voyage vs COA)
        base_freight = optimal_vessel["freight_rate_usd_mt"] if optimal_vessel else 20.0
        contract_res = contract_advisor.evaluate_contract_strategies(
            base_freight_usd_mt=base_freight,
            cargo_parcel_mt=payload.cargo_volume_mt,
            total_annual_demand_mt=payload.cargo_volume_mt * (12 / payload.horizon_months),
            forecast_trend_pct_90d=fc_res["pct_change_90d"],
            target_horizon_months=payload.horizon_months
        )
        
        # 4. Seasonal & Monsoon Risk for Destination
        risk_res = risk_engine.get_weather_and_seasonal_risk(payload.destination)
        
        # 5. Idle Scenario & Turnaround Analysis
        v_name = optimal_vessel["vessel_class"] if optimal_vessel else "Panamax"
        idle_res = risk_engine.analyze_idle_scenarios(v_name, payload.destination, payload.cargo_volume_mt)
        
        return {
            "status": "success",
            "optimization": opt_res,
            "contract_strategy": contract_res,
            "forecast_context": {
                "target_key": target_key,
                "target_label": fc_res["target_label"],
                "regime": fc_res["regime"],
                "trend_pct": fc_res["pct_change_90d"],
                "timing_signal": fc_res["timing_signal"],
                "timing_recommendation": fc_res["timing_recommendation"]
            },
            "weather_risk": risk_res,
            "idle_management": idle_res
        }
    except Exception as e:
        import traceback
        return {"status": "error", "message": str(e), "trace": traceback.format_exc()}

@app.get("/api/ports")
def get_ports():
    return {
        "east_coast_ports": INDIAN_EAST_COAST_PORTS,
        "overseas_ports": OVERSEAS_LOADING_PORTS
    }

@app.get("/api/vessels")
def get_vessels():
    return VESSEL_CLASSES

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
