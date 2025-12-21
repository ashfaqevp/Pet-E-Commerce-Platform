Transaction API
The main transaction request API is used to process all payments, regardless of if they are through either your own payment pages, the managed payment pages, or if your are using the hosted payment pages.

All requests are made using server-to-server calls, with JSON format data.

The API endpoint is: https://secure-global.paytabs.com/payment/request

The transaction request API must not be used from within a browser.

Request
You will need your server key in order to make these requests. This is not the same as the client key that is used within the managed payment pages. Authentication is done by including your server key in the 'Authorization:' header for the request.

The main details needed are your merchant profile ID (171760), the item cost, currency, description, a unique order reference, and either the callback URL or the return URL for your store (these URLs will only be used if the transaction required any form of browser redirection)


Fields:
{
  "profile_id":         Your profile ID,
  "tran_type":          "(sale, auth ..etc)",
  "tran_class":         "(ecom, moto, cont)",
  "cart_description":   "Description of the items/services",
  "cart_id":            "Unique order reference",
  "cart_currency":      "3 character currency code",
  "cart_amount":        The total amount due,
  "callback":           "https://yourdomain.com/yourcallback",
  "return":             "https://yourdomain.com/yourpage"
}
All requests must be sent using HTTP POST to the PayTabs transaction API endpoint: https://secure-global.paytabs.com/payment/request

Example:
curl --request POST \
  --url https://secure-global.paytabs.com/payment/request \
  --header 'authorization: Your profile server key' \
  --header 'content-type: application/json' \
  --data '{
    "profile_id": Your profile ID,
    "tran_type": "sale",
    "tran_class": "ecom" ,
    "cart_id":"4244b9fd-c7e9-4f16-8d3c-4fe7bf6c48ca",
    "cart_description": "Dummy Order 35925502061445345",
    "cart_currency": "AED",
    "cart_amount": 46.17,
    "callback": "https://yourdomain.com/yourcallback",
    "return": "https://yourdomain.com/yourpage"
  }'
Responses
The response from the transaction API can be grouped into 3 main categories:


Result:
If the transaction can be processed without requiring any additional details, then the response from the API will be the final transaction results.

Result sample:
{
  "tran_ref": "TST2014900000688",
  "cart_id": "Sample Payment",
  "cart_description": "Sample Payment",
  "cart_currency": "AED",
  "cart_amount": "1",
  "customer_details": {
    "name": "John Smith",
    "email": "jsmith@gmail.com",
    "phone": "9711111111111",
    "street1": "404, 11th st, void",
    "city": "Dubai",
    "state": "DU",
    "country": "AE",
    "ip": "127.0.0.1"
  },
  "payment_result": {
    "response_status": "A",
    "response_code": "831000",
    "response_message": "Authorised",
    "acquirer_message": "ACCEPT",
    "acquirer_rrn": "014910159369",
    "transaction_time": "2020-05-28T14:35:38+04:00"
  },
  "payment_info": {
    "card_type": "Credit",
    "card_scheme": "Visa",
    "payment_description": "4111 11## #### 1111"
  }
}
Redirection:
If for any reason additional information is needed from the customer, then the system will trigger a browser redirect. You must direct the customer to the URL provided, using the method indicated.


This can happen if (for example) the customers card issuer requires 3D Secure authentication of the customer.

Redirect sample:
{
  "tran_ref": "TST2011800000216",
  "cart_id": "4244b9fd-c7e9-4f16-8d3c-4fe7bf6c48ca",
  "cart_description": "Dummy Order 123456",
  "cart_currency": "AED",
  "cart_amount": "46.17",
  "callback": "https://yourdomain.com/yourcallback",
  "return": "https://yourdomain.com/yourpage",
  "redirect_url": "https://secure-global.paytabs.com/payment/page/REF/redirect"
}
Once the customer has completed the steps required by the redirection, the PayTabs gateway will process the transaction, and once that has completed the actions taken depend on if you supplied a callback URL or a return URL in the original request.

If you supplied a callback URL, then the PayTabs gateway will send the transaction results to that URL using a HTTP POST. This will be a purely server-to-server request, the customers browser will not be involved. Your systems should provide HTTP response with response codes 200 or 201.

Return sample:
tranRef=TST2015600000752&cartId=Sample+Payment&respStatus=A&respCode=831000&respMessage=Authorised&acquirerRRN=015607167400&aquirerMessage=ACCEPT&token=2C4650BF67A3EA30C6B791FE628278B8&customerEmail=jsmith%40gmail.com

Parameter	Description	Type
tranRef	Transaction reference	String
cartId	Cart ID	String
respStatus	Response Status	String
respCode	Response Code	Integer
respMessage	Response Message	String
acquirerRRN	Acquirer RRN	String
acquirerMessage	Acquirer Message	String
token	Tokenization identifier	String
customerEmail	Customer Email	String
signature	Request Signature	String

Verify request signature:
We recommend to verify request signature, to ensure that the redirect request is genuine.

PHP Sample:
<?php
  // Profile Key (ServerKey)
  $serverKey = "SRJNLKHG6K-HWMDRGW66J-LRWTGDGRNK"; // Example

  // Request body include a signature post Form URL encoded field
  // 'signature' (hexadecimal encoding for hmac of sorted post form fields)
  $signature_fields = filter_input_array(INPUT_POST);
  $requestSignature = $signature_fields["signature"];
  unset($signature_fields["signature"]);

  // Ignore empty values fields
  $signature_fields = array_filter($signature_fields);
  
  // Sort form fields 
  ksort($signature_fields);

  // Generate URL-encoded query string of Post fields except signature field.
  $query = http_build_query($signature_fields);

  $signature = hash_hmac('sha256', $query, $serverKey);
  if (hash_equals($signature,$requestSignature) === TRUE) {
    // VALID Redirect
    // Do your logic
  }else{
    // INVALID Redirect
    // Log request
  }
?>
Error:
The gateway uses conventional HTTP response codes to indicate the success or failure of an API request. In general: Codes in the 2xx range indicate success. Codes in the 4xx range indicate an error if the system is unable to process the request due to (for example) any errors within the request details. Codes in the 5xx range indicate an error with the servers (these are rare).

The response body will include app error code (that could be handled programmatically) and error message

Error sample:
{
  "code": 206,
  "message": "Invalid currency code"
}
Including customer details
The customer details can be included in the transaction request. This is optional if you are operating via the hosted payment pages, if they are not supplied then the payment pages will prompt the customer for the details. If you already have the customer details then it is recommended to include them as that improves the experience for the customer by removing the need for them to enter this again.

For transactions though the managed form or own form integrations where the payment details are provided as part of the request, then the customer details must also be provided.

Sample:
{    
  "profile_id": 123456,
  "tran_type": "sale",
  "tran_class": "ecom" ,
  "cart_id":"2ca6efa1-efa3-4032-90bb-11196cef5bd2",
  "cart_description": "Dummy Order 123456",
  "cart_currency": "AED",
  "cart_amount": 47.944,
  "callback": "https://yourdomain.com/yourcallback",
  "return": "https://yourdomain.com/yourpage",
  "customer_details": {
    "name": "John Smith",
    "email": "jsmith@gmail.com",
    "street1": "404, 11th st, void",
    "city": "Dubai",
    "state": "DU",
    "country": "AE",
    "ip": "91.74.146.168"
  }
}
Including payment details
If you are using the managed form or own form integrations, you must include details of the payment method provided by the customer.

If no payment details are included, then the request will be processed as if it was for the hosted payment pages.

When including the payment details, you must also include the customer details.

Managed form
With the managed form integration, the card details are transmitted to the PayTabs servers by the paylib.js library, and a temporary payment token is obtained. This token must be included in the transaction request

Request with payment token:
{
  "profile_id":         Your profile ID,
  "tran_type":          "sale",
  "tran_class":         "ecom",
  "cart_description":   "Description of the items/services",
  "cart_id":            "Unique order reference",
  "cart_currency":      "3 character currency code",
  "cart_amount":        The total amount due,
  "callback":           "https://yourdomain.com/yourcallback"
  "return":             "https://yourdomain.com/yourpage",
  "payment_token":      "Temporary single-use payment token provided by paylib.js"
}
Own form
With the own form integration, the card details must be provided directly in the request.

Request with card details:
{
  "profile_id":         Your profile ID,
  "tran_type":          "sale",
  "tran_class":         "ecom",
  "cart_description":   "Description of the items/services",
  "cart_id":            "Unique order reference",
  "cart_currency":      "3 character currency code",
  "cart_amount":        The total amount due,
  "callback":           "https://yourdomain.com/yourcallback"
  "return":             "https://yourdomain.com/yourpage",
  "card_details": {
    "pan":              "The card number",
    "expiry_month":     Month part of the expiry date, 1-12,
    "expiry_year":      Year part of the expiry date, as a 4 digit year,
    "cvv":              "Card security code"
  }
}
Example:
curl --request POST \
  --url https://secure-global.paytabs.com/payment/request \
  --header 'authorization: PROFILE-SERVER-KEY' \
  --header 'content-type: application/json' \
  --data '{    
    "profile_id": 123456,
    "tran_type": "sale",
    "tran_class": "ecom" ,
    "cart_id":"897961dd-d91e-45a9-ac9e-d1b34d49bad9",
    "cart_description": "Dummy Order 4696563498614784",
    "cart_currency": "AED",
    "cart_amount": 47.944,
    "return": "none",
    "customer_details": {
      "name": "John Smith",
      "email": "jsmith@gmail.com",
      "street1": "404, 11th st, void",
      "city": "Dubai",
      "country": "AE",
      "ip": "94.204.129.89"
    },
    "card_details": {
      "pan": "4111111111111111",
      "cvv": "123",
      "expiry_month": 12,
      "expiry_year": 20 
    }
  }'
Follow-Up Transactions
You can do follow-up transaction requests (Refund, Void ... etc)

Fields:
{
  "profile_id": Your profile ID,
  "tran_type": Transaction type (refund, void),
  "tran_ref": Transaction reference,
  "cart_id": "Unique order reference",
  "cart_description": Cart Description,
  "cart_currency": 3 character currency code,
  "cart_amount": The follow-up request amount
}
Example:
curl --request POST \
  --url https://secure-global.paytabs.com/payment/request \
  --header 'authorization: PROFILE-SERVER-KEY' \
  --header 'content-type: application/json' \
  --data '{
    "profile_id": 123456,
    "tran_type": "refund",
    "tran_ref": "TST2008500000227",
    "cart_id": "897961dd-d91e-45a9-ac9e-d1b34d49bad9",
    "cart_description": "Dummy Order 4696563498614784",
    "cart_currency": "AED",
    "cart_amount": 47.944
  }'
Query Transaction
Lookup of a transaction based on the transaction ref. Returns indication is transaction has been completed or not, and what the result was if it has been completed.

Fields:
{
  "profile_id": Your profile ID,
  "tran_ref": Transaction reference,
}
Example:
curl --request POST \
  --url https://secure-global.paytabs.com/payment/query \
  --header 'authorization: PROFILE-SERVER-KEY' \
  --header 'content-type: application/json' \
  --data '{
    "profile_id": 123456,
    "tran_ref": "TST2008500000227",
  }'
Result sample:
{
  "tran_ref": "TST2014900000688",
  "cart_id": "Sample Payment",
  "cart_description": "Sample Payment",
  "cart_currency": "AED",
  "cart_amount": "1",
  "customer_details": {
    "name": "John Smith",
    "email": "jsmith@gmail.com",
    "phone": "9711111111111",
    "street1": "404, 11th st, void",
    "city": "Dubai",
    "state": "DU",
    "country": "AE",
    "ip": "127.0.0.1"
  },
  "payment_result": {
    "response_status": "A",
    "response_code": "831000",
    "response_message": "Authorised",
    "acquirer_message": "ACCEPT",
    "acquirer_rrn": "014910159369",
    "transaction_time": "2020-05-28T14:35:38+04:00"
  },
  "payment_info": {
    "card_type": "Credit",
    "card_scheme": "Visa",
    "payment_description": "4111 11## #### 1111"
  }
}
Query Token
Lookup of a token details and attached payment details such card details, customer details, and transaction reference.

Fields:
{
  "profile_id": Your profile ID,
  "token": Token,
}
Example:
curl --request POST \
  --url https://secure-global.paytabs.com/payment/token \
  --header 'authorization: PROFILE-SERVER-KEY' \
  --header 'content-type: application/json' \
  --data '{
    "profile_id": 123456,
    "token": "JfN1DVwmdq7XXXkmfP11QpDWFHZjZzZz",
  }'
Result sample:
{
  "tran_ref": "TST2013300000309",
  "payment_info": {
    "card_type": "Credit",
    "card_scheme": "Visa",
    "payment_description": "4111 11## #### 1111"
  },
  "customer_details": {
    "name": "John Smith",
    "email": "jsmith@gmail.com",
    "phone": "9711111111111",
    "street1": "404, 11th st, void",
    "city": "Dubai",
    "state": "DU",
    "country": "AE",
    "ip": "127.0.0.1"
  }
}
Delete Token
Fields:
{
  "profile_id": Your profile ID,
  "token": Token,
}
Example:
curl --request POST \
  --url https://secure-global.paytabs.com/payment/token/delete \
  --header 'authorization: PROFILE-SERVER-KEY' \
  --header 'content-type: application/json' \
  --data '{
    "profile_id": 123456,
    "token": "JfN1DVwmdq7XXXkmfP11QpDWFHZjZzZz",
  }'
Result sample:
{
  "code": 0,
  "message": "success"
}
Other Options
You can pass certain params a long with the payment request like (framed, hide_shipping) to control the PayPage display

Fields:
{
  "profile_id": Your profile ID,
  "tran_type": Transaction type (refund, void),
  "tran_ref": Transaction reference,
  "cart_id": "Unique order reference",
  "cart_description": Cart Description,
  "cart_currency": 3 character currency code,
  "cart_amount": The follow-up request amount
  "framed": If set to true , this will enable the paypage to be displayed inside iFrame
  "hide_shipping": If set to true , this will make shipping_details optional and it will not be displayed on the paypage

}