Cart
 ↓
Checkout (address + summary)
 ↓
Create Order (status: pending, payment_status: unpaid)
 ↓
Create PayTabs Transaction (SERVER)
 ↓
Redirect user to PayTabs Hosted Page
 ↓
3DS / Card auth (PayTabs)
 ↓
PayTabs → Webhook (SERVER)
 ↓
Verify signature
 ↓
Update order:
   payment_status = paid
   status = confirmed
 ↓
Redirect user to success page
