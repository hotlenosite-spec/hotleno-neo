# Missing Evidence Report

Booking Reference: HOTLENO-1781162497741

The following required evidence was not found in the actual stored system data. No placeholder or mock log was created.

## availability-request

- Missing log: availability-request
- Searched in:
  - Firestore collection: bookings
  - Firestore collection: logs
  - Firestore collection: supplier_logs
  - Local folders: hotelbeds-hotels-certification-logs, hotelbeds-hotels-certification-working, hotelbeds-hotels-certification-archive, logs
- Reason: No stored availability-request payload was found for booking HOTLENO-1781162497741. No placeholder or mock log was created.

## availability-response

- Missing log: availability-response
- Searched in:
  - Firestore collection: bookings
  - Firestore collection: logs
  - Firestore collection: supplier_logs
  - Local folders: hotelbeds-hotels-certification-logs, hotelbeds-hotels-certification-working, hotelbeds-hotels-certification-archive, logs
- Reason: No stored availability-response payload was found for booking HOTLENO-1781162497741. No placeholder or mock log was created.

## checkrate-request

- Missing log: checkrate-request
- Searched in:
  - Firestore collection: bookings
  - Firestore collection: logs
  - Firestore collection: supplier_logs
  - Local folders: hotelbeds-hotels-certification-logs, hotelbeds-hotels-certification-working, hotelbeds-hotels-certification-archive, logs
- Reason: No Hotelbeds CheckRate request exists for this booking because the stored strategy is BOOKABLE_DIRECT/bookable_direct_skipped. No CheckRate API call was sent.

## checkrate-response

- Missing log: checkrate-response
- Searched in:
  - Firestore collection: bookings
  - Firestore collection: logs
  - Firestore collection: supplier_logs
  - Local folders: hotelbeds-hotels-certification-logs, hotelbeds-hotels-certification-working, hotelbeds-hotels-certification-archive, logs
- Reason: No Hotelbeds CheckRate response exists for this booking because the stored strategy is BOOKABLE_DIRECT/bookable_direct_skipped. No CheckRate API call was sent.

