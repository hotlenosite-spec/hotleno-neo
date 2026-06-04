# TBO Certification Updated Logs

Generated for TBO Hotel API certification using staging credentials configured locally.

Credentials are not included in this folder. Request and response files do not contain username, password, authorization headers, or basic auth values.

## Run Summary

- Run started: `2026-05-26T17:25:08.356Z`
- Run ended: `2026-05-26T17:27:09.999Z`
- Environment: `staging`
- GuestNationality: `SA`
- ResponseTime: `23`
- Result: 7 of 7 cases completed with Search, PreBook, Book, and BookingDetail all successful.

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

| Case | Scenario | Search | PreBook | Book | BookingDetail | ConfirmationNumber | BookingReferenceId | Files |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Case 1 | Room 1 - Adult 1 | OK | OK | OK | OK | VJJPBJ | TBO-BR-1-1779816312858 | Complete |
| Case 2 | Room 1 - Adult 1, Child 1 | OK | OK | OK | OK | YTZWWW | TBO-BR-2-1779816334456 | Complete |
| Case 3 | Room 1 - Adult 2, Child 2 | OK | OK | OK | OK | 24G4I9 | TBO-BR-3-1779816350453 | Complete |
| Case 4 | Room 1 - Adult 1 + Room 2 - Adult 1 | OK | OK | OK | OK | 5EWC3M | TBO-BR-4-1779816367326 | Complete |
| Case 5 | Room 1 - Adult 1, Child 1 + Room 2 - Adult 1 | OK | OK | OK | OK | 8PCJOZ | TBO-BR-5-1779816384452 | Complete |
| Case 6 | Room 1 - Adult 1, Child 2 + Room 2 - Adult 2 | OK | OK | OK | OK | BZSRAC | TBO-BR-6-1779816399971 | Complete |
| Case 7 | Booking room with supplements | OK | OK | OK | OK | FA8YVP | TBO-BR-7-1779816416835 | Complete |

## Certification Notes

- `GuestNationality` is `SA` for this run and is not hardcoded to `AE`.
- `ResponseTime` is `23`, the configured maximum allowed certification response time.
- Book requests use supported titles only: `Mr`, `Ms`, or `Mrs`. No `Master` title is sent.
- BookingDetail requests use `BookingReferenceId` first when available.
- PreBook is the source of final price and cancellation policies before Book.
- Supplements from Search/PreBook are preserved in the response logs and summarized in `summary.json`.

## PreBook Commercial Data

| Case | PreBook Final Price | CancelPolicies Count | Supplements Count | RateConditions Count | RoomPromotions Count |
| --- | ---: | ---: | ---: | ---: | ---: |
| Case 1 | 213.69 | 2 | 1 | 10 | 1 |
| Case 2 | 218.14 | 2 | 1 | 10 | 1 |
| Case 3 | 213.89 | 2 | 1 | 10 | 1 |
| Case 4 | 427.38 | 2 | 2 | 10 | 2 |
| Case 5 | 425.04 | 2 | 2 | 10 | 2 |
| Case 6 | 426.60 | 2 | 2 | 10 | 2 |
| Case 7 | 213.43 | 2 | 1 | 10 | 1 |
