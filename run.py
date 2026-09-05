#!/usr/bin/env python3
"""
Launcher for SAIL NaviFreight AI - Intelligent Freight Forecasting & Vessel Chartering System
SIH 2026 Problem Statement ID: 26006
Ministry of Steel / Steel Authority of India Limited (SAIL)
"""

import uvicorn
import os
import sys

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print("=" * 75)
    print("  SAIL NaviFreight AI - Intelligent Freight Forecasting System")
    print("  Ministry of Steel | SAIL | Smart India Hackathon (SIH 2026 PS-26006)")
    print("=" * 75)
    print("\nStarting application server at: http://127.0.0.1:8000")
    print("Open your browser and navigate to: http://localhost:8000\n")
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
