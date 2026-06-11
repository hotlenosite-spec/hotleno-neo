# Hotelbeds Accommodation Certification Package

This package contains evidence extracted from HOTLENO for booking `HOTLENO-1781162497741`.

Only real stored system data was used. No mock data and no fabricated logs were created.

## Contents

- `logs/`: extracted stored request/response evidence when present.
- `workflow/workflow-description.md`: HOTLENO Hotelbeds Accommodation workflow based on actual project code paths.
- `summary/certification-summary.md`: booking, occupancy, supplier, and cancellation summary.
- `missing-evidence-report.md`: required evidence that was not found in stored data.

## Evidence Files

- `logs/availability-request.json`: missing
- `logs/availability-response.json`: missing
- `logs/checkrate-request.json`: missing
- `logs/checkrate-response.json`: missing
- `logs/booking-request.json`: included
- `logs/booking-response.json`: included
- `logs/cancellation-request.json`: included
- `logs/cancellation-response.json`: included

## Redaction Policy

Only sensitive values such as API keys, secrets, signatures, authorization headers, tokens, and passwords are redacted. Operational booking data is kept when it exists in stored evidence.
