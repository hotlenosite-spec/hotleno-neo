# HOTLENO Hotelbeds Accommodation Workflow

This workflow description is based on the current HOTLENO code paths used for Hotelbeds Accommodation.

1. Search
   - The search UI sends the selected destination, dates, nationality, currency, and full room occupancy to `app/api/hotels/search/route.ts`.
   - For `supplier_tester` with `supplierScope=hotelbeds`, the route uses Hotelbeds only and bypasses general supplier settings for that tester.

2. Availability
   - The Hotelbeds supplier implementation in `lib/suppliers/hotelbeds-provider.ts` maps HOTLENO room details to Hotelbeds availability occupancies.
   - Returned Hotelbeds rates are normalized into HOTLENO hotel options by `lib/hotels/normalize-hotels.ts`, preserving Hotelbeds room package data and selected rooms.

3. Hotel Details
   - `app/[locale]/hotel/[hotelId]/page.tsx` loads the selected hotel from search state and keeps Hotelbeds package data, selected rooms, room names, board, rate keys, and total package price.

4. Room Selection
   - `components/hotel/room-selector.tsx` displays Hotelbeds room/package options. Multi-room packages keep `hotelbedsSelectedRooms` so the user selection remains the source of truth.

5. CheckRate
   - `app/api/user/bookings/route.ts` determines the Hotelbeds strategy from stored rate data.
   - For BOOKABLE rates, the stored flow records `bookable_direct_skipped` and no CheckRate request is sent.
   - For RECHECK rates, the route uses Hotelbeds CheckRate before Booking.

6. Review
   - `app/[locale]/booking/review/page.tsx` builds traveler forms from roomDetails and sends the selected Hotelbeds package/rooms to `/api/user/bookings`.

7. Booking Confirmation
   - `app/api/user/bookings/route.ts` builds the Hotelbeds BookingRQ from `hotelbedsSelectedRooms`, validates final payload distribution, submits BookingRQ through `lib/suppliers/hotelbeds-hotels-client.ts`, and stores safe response diagnostics in booking metadata.

8. Voucher
   - The real voucher page is `app/[locale]/account/bookings/[bookingId]/voucher/page.tsx`, rendered with `components/hotels/hotelbeds-hotel-voucher.tsx`.
   - It uses the stored booking data and does not use the sample voucher page.

9. Cancellation
   - `app/api/bookings/cancel/route.ts` extracts the Hotelbeds reference from stored supplier fields/metadata.
   - For Hotelbeds tester in test environment, it calls `HotelbedsHotelsClient.cancel()`, which uses `DELETE /hotel-api/1.0/bookings/{reference}?cancellationFlag=CANCELLATION`.
   - Safe cancellation response diagnostics are stored in booking metadata.
