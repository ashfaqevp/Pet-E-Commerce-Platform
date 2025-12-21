Checkout
 ↓
Create order (status = pending)
 ↓
Redirect to PayTabs
 ↓
PayTabs processes payment
 ↓
PayTabs → CALLBACK URL (server)
 ↓
Verify signature
 ↓
Update order in DB (paid / failed)
 ↓
User browser → RETURN URL
 ↓
Frontend checks DB order status

