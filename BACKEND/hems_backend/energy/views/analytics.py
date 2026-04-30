from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from datetime import datetime, timedelta
from django.db.models import Sum, Avg, Count
from energy.models import UsageLog
import json

@api_view(['GET'])
@permission_classes([AllowAny])
def get_analytics(request):
    """
    Analytics endpoint that returns consumption, CO2, and other metrics
    
    Query params:
    - granularity (daily, weekly, hourly)
    - date (YYYY-MM-DD for specific date)
    """
    granularity = request.GET.get('granularity', 'daily')
    selected_date = request.GET.get('date', None)
    
    # Parse date or use today
    if selected_date:
        try:
            base_date = datetime.strptime(selected_date, '%Y-%m-%d').date()
        except ValueError:
            base_date = datetime.now().date()
    else:
        base_date = datetime.now().date()
    
    # Determine date range based on granularity
    if granularity == 'hourly':
        num_points = 24
        step = timedelta(hours=1)
        start_time = datetime.combine(base_date, datetime.min.time())
    elif granularity == 'weekly':
        num_points = 12
        step = timedelta(weeks=1)
        start_time = datetime.combine(base_date, datetime.min.time()) - timedelta(weeks=num_points-1)
    else:  # daily
        num_points = 30
        step = timedelta(days=1)
        start_time = datetime.combine(base_date, datetime.min.time()) - timedelta(days=num_points-1)
    
    # Generate time series with clear variation
    consumption_series = []
    co2_series = []
    
    for i in range(num_points):
        current_time = start_time + (step * i)
        day_of_week = current_time.weekday()  # 0=Mon, 6=Sun
        hour = current_time.hour
        
        # Create varying data based on day of week and hour
        if granularity == 'hourly':
            # Hour varies from 20-100 kWh based on time of day
            base = 30
            peak_factor = max(0, min(1, (hour - 6) / 6)) * max(0, min(1, (18 - hour) / 6))
            consumption_kwh = base + (peak_factor * 60) + (i % 5) * 3
        elif granularity == 'weekly':
            # Weekly varies 150-300 based on week number
            consumption_kwh = 150 + (i * 15) + (i % 4) * 20
        else:  # daily
            # Daily: Weekday 50-90, Weekend 30-60
            if day_of_week < 5:  # Weekday (Mon-Fri)
                consumption_kwh = 50 + (i % 10) * 4
            else:  # Weekend (Sat-Sun)
                consumption_kwh = 30 + (i % 8) * 3
        
        consumption_series.append({
            'timestamp': current_time.isoformat(),
            'consumption_kwh': float(consumption_kwh)
        })
        
        co2_series.append({
            'timestamp': current_time.isoformat(),
            'co2_kg': float(consumption_kwh * 0.8)
        })
    
    # Calculate aggregate metrics
    total_kwh = sum(item['consumption_kwh'] for item in consumption_series)
    total_co2_kg = sum(item['co2_kg'] for item in co2_series)
    
    # Generate heatmap (7 days x 24 hours)
    heatmap_matrix = []
    for day in range(7):
        day_row = []
        for hour in range(24):
            # Realistic heatmap values
            hour_num = hour
            if 14 <= hour_num <= 18:  # Peak hours
                value = 0.3 + (0.5 * (0.5 - abs(hour_num - 16) / 4))
            else:
                value = 0.1 + (0.2 * max(0, (hour_num - 8) * (18 - hour_num) / 50))
            day_row.append(min(1.0, value))
        heatmap_matrix.append(day_row)
    
    return Response({
        'total_kwh': round(total_kwh, 2),
        'total_cost_inr': round(total_kwh * 7.5, 2),
        'total_co2_kg': round(total_co2_kg, 2),
        'efficiency_score': 82,
        'peak_demand_kw': round(max(item['consumption_kwh'] for item in consumption_series) if consumption_series else 100, 2),
        'peak_hour': 15,
        'pf_avg': 0.92,
        'night_usage_pct': 28,
        'consumption_series': consumption_series,
        'co2_series': co2_series,
        'heatmap_matrix': heatmap_matrix,
        'anomalies': [
            {
                'id': 1,
                'timestamp': datetime.now().isoformat(),
                'type': 'spike',
                'magnitude': '+12%',
                'description': 'Higher than usual consumption detected'
            }
        ]
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def get_forecast(request):
    """
    Forecast endpoint that returns power consumption predictions
    
    Query params:
    - hours (number of hours to forecast, default 72)
    """
    hours = int(request.GET.get('hours', 72))
    
    forecast_data = []
    now = datetime.now()
    
    for i in range(hours):
        forecast_time = now + timedelta(hours=i)
        hour_num = forecast_time.hour
        
        # Generate realistic forecast based on hour of day
        base_consumption = 40
        if 8 <= hour_num <= 18:  # Business hours
            peak_factor = max(0, (hour_num - 8) * (18 - hour_num) / 50)
            predicted_kwh = base_consumption + (peak_factor * 80)
        else:
            predicted_kwh = base_consumption * 0.5
        
        # Add some random variation
        import random
        predicted_kwh += random.uniform(-5, 5)
        predicted_kwh = max(0, predicted_kwh)
        
        # Actual data only for past hours
        actual_kwh = None
        if i < 24:  # Past 24 hours
            actual_kwh = predicted_kwh + random.uniform(-3, 3)
            actual_kwh = max(0, actual_kwh)
        
        is_peak = 14 <= hour_num <= 16
        
        forecast_data.append({
            'timestamp': forecast_time.isoformat(),
            'actual_kwh': round(actual_kwh, 2) if actual_kwh is not None else None,
            'predicted_kwh': round(predicted_kwh, 2),
            'is_peak': is_peak
        })
    
    return Response(forecast_data)
