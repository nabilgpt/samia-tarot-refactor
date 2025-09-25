"""
SAMIA-TAROT Simple API Server
A working demonstration of the core API functionality
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from datetime import datetime
from db import db_fetch_all, db_fetch_one, db_exec

# Initialize FastAPI app
app = FastAPI(
    title="SAMIA TAROT API",
    description="Spiritual Guidance Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/api/ops/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        result = db_fetch_one("SELECT 1 as status, NOW() as timestamp")
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": "connected",
            "version": "1.0.0"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

# Get daily horoscopes (public endpoint)
@app.get("/api/horoscopes/daily")
async def get_daily_horoscopes():
    """Get today's approved daily horoscopes"""
    try:
        query = """
        SELECT id, zodiac, ref_date, approved_at, text_content
        FROM horoscopes
        WHERE scope = 'daily'
        AND ref_date = CURRENT_DATE
        AND approved_at IS NOT NULL
        ORDER BY zodiac
        """
        horoscopes = db_fetch_all(query)

        return {
            "horoscopes": [dict(h) for h in horoscopes] if horoscopes else [],
            "date": datetime.now().date().isoformat(),
            "count": len(horoscopes) if horoscopes else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch horoscopes: {str(e)}")

# Get services
@app.get("/api/services")
async def get_services():
    """Get available services"""
    try:
        query = """
        SELECT id, code, name, is_premium, is_active, base_price, meta
        FROM services
        WHERE is_active = true
        ORDER BY name
        """
        services = db_fetch_all(query)

        return {
            "services": [dict(s) for s in services] if services else [],
            "count": len(services) if services else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch services: {str(e)}")

# Get system metrics
@app.get("/api/ops/metrics")
async def get_metrics():
    """Get system metrics"""
    try:
        # Get basic database stats
        stats = {}

        tables = ['profiles', 'orders', 'horoscopes', 'services', 'media_assets']
        for table in tables:
            try:
                result = db_fetch_one(f"SELECT COUNT(*) as count FROM {table}")
                stats[f"{table}_count"] = result['count'] if result else 0
            except:
                stats[f"{table}_count"] = 0

        return {
            "timestamp": datetime.now().isoformat(),
            "database_stats": stats,
            "api_status": "running"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch metrics: {str(e)}")

# Get database snapshot
@app.get("/api/ops/snapshot")
async def get_snapshot():
    """Get database snapshot"""
    try:
        # Get table information
        tables_query = """
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
        """
        tables = db_fetch_all(tables_query)

        return {
            "timestamp": datetime.now().isoformat(),
            "database": "connected",
            "tables": [dict(t) for t in tables] if tables else [],
            "table_count": len(tables) if tables else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get snapshot: {str(e)}")

# Get countries metadata
@app.get("/api/meta/countries")
async def get_countries():
    """Get countries metadata"""
    countries = [
        {"code": "US", "name": "United States", "timezone": "America/New_York"},
        {"code": "UK", "name": "United Kingdom", "timezone": "Europe/London"},
        {"code": "CA", "name": "Canada", "timezone": "America/Toronto"},
        {"code": "AU", "name": "Australia", "timezone": "Australia/Sydney"},
        {"code": "AE", "name": "United Arab Emirates", "timezone": "Asia/Dubai"},
        {"code": "SA", "name": "Saudi Arabia", "timezone": "Asia/Riyadh"},
        {"code": "EG", "name": "Egypt", "timezone": "Africa/Cairo"},
        {"code": "DE", "name": "Germany", "timezone": "Europe/Berlin"},
        {"code": "FR", "name": "France", "timezone": "Europe/Paris"},
        {"code": "IT", "name": "Italy", "timezone": "Europe/Rome"},
    ]
    return {"countries": countries}

# Get zodiac signs metadata
@app.get("/api/meta/zodiacs")
async def get_zodiacs():
    """Get zodiac signs metadata"""
    zodiacs = [
        {"sign": "Aries", "element": "Fire", "dates": "March 21 - April 19", "symbol": "♈"},
        {"sign": "Taurus", "element": "Earth", "dates": "April 20 - May 20", "symbol": "♉"},
        {"sign": "Gemini", "element": "Air", "dates": "May 21 - June 20", "symbol": "♊"},
        {"sign": "Cancer", "element": "Water", "dates": "June 21 - July 22", "symbol": "♋"},
        {"sign": "Leo", "element": "Fire", "dates": "July 23 - August 22", "symbol": "♌"},
        {"sign": "Virgo", "element": "Earth", "dates": "August 23 - September 22", "symbol": "♍"},
        {"sign": "Libra", "element": "Air", "dates": "September 23 - October 22", "symbol": "♎"},
        {"sign": "Scorpio", "element": "Water", "dates": "October 23 - November 21", "symbol": "♏"},
        {"sign": "Sagittarius", "element": "Fire", "dates": "November 22 - December 21", "symbol": "♐"},
        {"sign": "Capricorn", "element": "Earth", "dates": "December 22 - January 19", "symbol": "♑"},
        {"sign": "Aquarius", "element": "Air", "dates": "January 20 - February 18", "symbol": "♒"},
        {"sign": "Pisces", "element": "Water", "dates": "February 19 - March 20", "symbol": "♓"},
    ]
    return {"zodiacs": zodiacs}

# Root endpoint
@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": "SAMIA TAROT API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/api/ops/health",
        "cosmic_message": "🔮 Your spiritual journey awaits! ✨"
    }

# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
            "timestamp": datetime.now().isoformat()
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "api_simple:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )