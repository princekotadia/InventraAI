#!/usr/bin/env python3
import sys
import traceback

try:
    print("Starting import test...")
    sys.stdout.flush()
    
    print("Importing database...")
    sys.stdout.flush()
    import database
    
    print("Importing models...")
    sys.stdout.flush()
    import models
    
    print("Importing routes...")
    sys.stdout.flush()
    from routes import product_routes, sales, analytics, vision
    
    print("Importing main...")
    sys.stdout.flush()
    import main
    
    print("SUCCESS: Backend imports successfully!")
    sys.stdout.flush()
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print(f"\nTraceback:")
    traceback.print_exc()
    sys.stdout.flush()
