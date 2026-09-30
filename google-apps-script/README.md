# Booking notification backend

This Google Apps Script receives requests from `booking.html`, stores them in a Google Sheet, emails Akshay with action links, and sends the requester a confirmation after acceptance.

## Setup

1. Create a Google Sheet and copy its ID from the URL.
2. Open **Extensions → Apps Script**, paste `Code.gs`, and save.
3. In **Project Settings → Script properties**, add:
   - `OWNER_EMAIL`: the email address that should receive booking alerts
   - `SHEET_ID`: the Google Sheet ID
   - `CALENDAR_ID`: usually `primary`
   - `TIMEZONE`: `America/Los_Angeles`
   - `WEB_APP_URL`: the deployed web-app URL
4. In Apps Script, open **Services (+)** and add **Google Calendar API**. If prompted, enable the Calendar API in the linked Google Cloud project.
5. Deploy via **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the web-app URL into `booking-config.js` as `window.BOOKING_ENDPOINT`.
7. Push the portfolio files to GitHub Pages.

The Google Calendar event is created only after you click **Accept**. The invitation includes a Google Meet link and is sent to the requester automatically.
