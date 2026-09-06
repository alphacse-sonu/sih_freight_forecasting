#!/usr/bin/env python3
"""
Launcher for SAIL NaviFreight AI - Intelligent Freight Forecasting & Vessel Chartering System
SIH 2026 Problem Statement ID: 26006
Ministry of Steel / Steel Authority of India Limited (SAIL)
"""

import sys
import os

script_dir = os.path.dirname(os.path.abspath(__file__))

# If running outside the project virtual environment, ensure the venv site-packages are in sys.path
venv_dir = os.path.join(script_dir, "venv")
venv_site_packages = os.path.join(venv_dir, "lib", f"python{sys.version_info.major}.{sys.version_info.minor}", "site-packages")
if os.path.exists(venv_site_packages) and venv_site_packages not in sys.path:
    sys.path.insert(0, venv_site_packages)

try:
    import uvicorn
except ImportError:
    print("\n" + "=" * 65)
    print("❌ ERROR: Missing required dependencies (uvicorn, fastapi, etc.)")
    print("=" * 65)
    print("Please run:")
    print("  source venv/bin/activate")
    print("  python3 run.py")
    print("Or install directly via:")
    print(f"  {sys.executable} -m pip install -r requirements.txt")
    print("=" * 65 + "\n")
    sys.exit(1)

if __name__ == "__main__":
    os.chdir(script_dir)
    print("=" * 75)
    print("  SAIL NaviFreight AI - Intelligent Freight Forecasting System")
    print("  Ministry of Steel | SAIL | Smart India Hackathon (SIH 2026 PS-26006)")
    print("=" * 75)
    print("\nStarting application server at: http://127.0.0.1:8000")
    print("Open your browser and navigate to: http://localhost:8000\n")
    
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
