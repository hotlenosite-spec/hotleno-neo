# Case 7 - Booking Room With Supplements

This case was prepared for the TBO certification supplement scenario using the updated certification run.

## Result

- Search: `Status.Code = 200`, `Status.Description = Successful`
- PreBook: `Status.Code = 200`, `Status.Description = Successful`
- Book: `Status.Code = 200`, `Status.Description = Successful`
- BookingDetail: `Status.Code = 200`, `Status.Description = Successful`
- Booking status: `Confirmed`
- ConfirmationNumber: `FA8YVP`
- BookingReferenceId used in request: `TBO-BR-7-1779816416835`
- GuestNationality: `SA`
- ResponseTime: `23`

## Supplement Evidence

Supplements were found and included in the case logs:

- `search-response.json`: room contains `Supplements`
- `prebook-response.json`: room contains `Supplements`
- `booking-detail-response.json`: confirmed booking room contains `Supplements`

Supplement returned by TBO:

- Type: `AtProperty`
- Description: `mandatory_tax`
- Price: `40`
- Currency: `AED`

The full request/response sequence is present in this folder:

- `search-request.json`
- `search-response.json`
- `prebook-request.json`
- `prebook-response.json`
- `book-request.json`
- `book-response.json`
- `booking-detail-request.json`
- `booking-detail-response.json`
