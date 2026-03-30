import math
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from energy.models import PredictionLog, MLSystemEvent

class Command(BaseCommand):
    help = 'Computes rolling MAE and detects model drift from recent PredictionLogs'

    def handle(self, *args, **kwargs):
        # We need a decent window of predictions to calculate rolling MAE.
        # Check logs for the last 24 hours.
        cutoff = timezone.now() - timedelta(hours=24)
        logs = PredictionLog.objects.filter(timestamp__gte=cutoff).order_by('timestamp')

        if len(logs) < 60:
            self.stdout.write(self.style.WARNING(f"Not enough recent logs to calculate drift (found {len(logs)}, need at least 60)."))
            return

        baseline_mae = 1.5 # Example baseline placeholder from training

        # Calculate recent error
        errors = []
        for log in logs:
            if log.target_actual_kw is not None:
                errors.append(abs(log.predicted_power_kw - log.target_actual_kw))
        
        if not errors:
            self.stdout.write(self.style.WARNING("No actual values recorded in recent logs, cannot evaluate MAE."))
            return

        window_mae = sum(errors) / len(errors)
        mae_threshold = baseline_mae * 1.5

        if window_mae > baseline_mae:
            mae_drift_ratio = (window_mae - baseline_mae) / max(baseline_mae, 1e-4)
        else:
            mae_drift_ratio = 0.0

        self.stdout.write(self.style.SUCCESS(f"Monitoring Results: Baseline MAE={baseline_mae:.4f} | Recent Window MAE={window_mae:.4f}"))
        self.stdout.write(self.style.SUCCESS(f"Degradation Ratio: {mae_drift_ratio:.2%} | Threshold: 15%"))

        # Trigger event if drift detected 
        if mae_drift_ratio > 0.15:
            self.stdout.write(self.style.ERROR(f"ALERT: Performance degradation detected (> 15%)! Logging System Event."))
            MLSystemEvent.objects.create(
                event_type="PERFORMANCE_DEGRADATION",
                severity="ERROR",
                description=f"Model performance drift detected. MAE moved from {baseline_mae:.2f} to {window_mae:.2f} kW.",
                metrics={
                    "baseline_mae": baseline_mae,
                    "window_mae": window_mae,
                    "mae_drift_ratio": mae_drift_ratio
                }
            )
        else:
            self.stdout.write(self.style.SUCCESS("✓ No significant degradation detected."))
