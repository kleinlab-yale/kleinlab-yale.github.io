# MIXA Calibration Validation

Three prespecified independent known-truth designs; fresh outer seeds disjoint from 0.5.9. Target-specific critical values are calculated solely from each fitted dataset's simulated experiments. No benchmark-tuned thresholds, interval inflation or discarded failed experiments. Rates/other mechanisms are not coverage-calibrated by this KD-only study.

```json
{
  "summaries": [
    {
      "scenario": "measured_baseline_IID",
      "availability": {
        "n": 100,
        "count": 100,
        "fraction": 1.0,
        "mc95_low": 0.9630065017930143,
        "mc95_high": 1.0
      },
      "coverage_when_available": {
        "n": 100,
        "count": 93,
        "fraction": 0.93,
        "mc95_low": 0.8625048526092651,
        "mc95_high": 0.9656807389327273
      },
      "coverage_all_requested": {
        "n": 100,
        "count": 93,
        "fraction": 0.93,
        "mc95_low": 0.8625048526092651,
        "mc95_high": 0.9656807389327273
      }
    },
    {
      "scenario": "measured_baseline_OU",
      "availability": {
        "n": 100,
        "count": 100,
        "fraction": 1.0,
        "mc95_low": 0.9630065017930143,
        "mc95_high": 1.0
      },
      "coverage_when_available": {
        "n": 100,
        "count": 94,
        "fraction": 0.94,
        "mc95_low": 0.8752318455410406,
        "mc95_high": 0.9722138760368118
      },
      "coverage_all_requested": {
        "n": 100,
        "count": 94,
        "fraction": 0.94,
        "mc95_low": 0.8752318455410406,
        "mc95_high": 0.9722138760368118
      }
    },
    {
      "scenario": "shared_control_and_stock",
      "availability": {
        "n": 100,
        "count": 100,
        "fraction": 1.0,
        "mc95_low": 0.9630065017930143,
        "mc95_high": 1.0
      },
      "coverage_when_available": {
        "n": 100,
        "count": 94,
        "fraction": 0.94,
        "mc95_low": 0.8752318455410406,
        "mc95_high": 0.9722138760368118
      },
      "coverage_all_requested": {
        "n": 100,
        "count": 94,
        "fraction": 0.94,
        "mc95_low": 0.8752318455410406,
        "mc95_high": 0.9722138760368118
      }
    }
  ]
}
```
