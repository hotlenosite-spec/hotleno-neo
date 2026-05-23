# TBO Certification Complete Logs

Generated for TBO Hotel API certification using staging credentials configured in `.env.local`.

Credentials are not included in this folder. Request and response files were scrubbed and do not contain username, password, authorization headers, or basic auth values.

## File Set

Each certification case folder from `case-01` through `case-07` contains the full eight-file sequence:

- `search-request.json`
- `search-response.json`
- `prebook-request.json`
- `prebook-response.json`
- `book-request.json`
- `book-response.json`
- `booking-detail-request.json`
- `booking-detail-response.json`

## Case Summary

| Case | Scenario | Rooms / Guests | Search | PreBook | Book | BookingDetail | ConfirmationNumber | Files |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Case 1 | Room 1 - Adult 1 | 1 room: A1 C0 | 200 Successful | 200 Successful | 200 Successful | 200 Successful / Confirmed | LWURI9 | `case-01/` |
| Case 2 | Room 1 - Adult 1, Child 1 | 1 room: A1 C1 | 200 Successful | 200 Successful | 200 Successful | 200 Successful / Confirmed | P7AZ3M | `case-02/` |
| Case 3 | Room 1 - Adult 2, Child 2 | 1 room: A2 C2 | 200 Successful | 200 Successful | 200 Successful | 200 Successful / Confirmed | SHR6OZ | `case-03/` |
| Case 4 | Room 1 - Adult 1 + Room 2 - Adult 1 | 2 rooms: A1 C0 + A1 C0 | 200 Successful | 200 Successful | 200 Successful | 200 Successful / Confirmed | VS7EAC | `case-04/` |
| Case 5 | Room 1 - Adult 1, Child 1 + Room 2 - Adult 1 | 2 rooms: A1 C1 + A1 C0 | 200 Successful | 200 Successful | 200 Successful | 200 Successful / Confirmed | Z2NLVP | `case-05/` |
| Case 6 | Room 1 - Adult 1, Child 2 + Room 2 - Adult 2 | 2 rooms: A1 C2 + A2 C0 | 200 Successful | 200 Successful | 200 Successful | 200 Successful / Confirmed | 2D3TH2 | `case-06/` |
| Case 7 | Booking room with supplements | 1 room: A2 C0 | 200 Successful | 200 Successful | 200 Successful | 200 Successful / Confirmed | 5NK12F | `case-07/` |

## BookingDetail

BookingDetail was called after every successful Book response. Each `booking-detail-response.json` contains:

- `Status.Code`: `200`
- `Status.Description`: `Successful`
- `BookingDetail.BookingStatus`: `Confirmed`
- `BookingDetail.ConfirmationNumber`: matching the Book response ConfirmationNumber

## Case 7 Supplements

Case 7 explicitly includes supplements in:

- `case-07/search-response.json`
- `case-07/prebook-response.json`
- `case-07/booking-detail-response.json`

The supplement returned is an at-property mandatory tax:

- Type: `AtProperty`
- Description: `mandatory_tax`
- Price: `40`
- Currency: `AED`

See `case-07/README.md` for the case-specific supplement note.
