#!/bin/bash

# AirPay Messenger API Test Script
# This script demonstrates all API endpoints with curl examples

# Configuration
API_BASE_URL="http://localhost:3000/api/v1"
API_KEY="your-api-key-here"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================================"
echo "AirPay Messenger API Tests"
echo "================================================"
echo ""

# Function to make API requests
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3

    echo -e "${BLUE}➜${NC} $method $endpoint"

    if [ -z "$data" ]; then
        response=$(curl -s -X "$method" \
            -H "Authorization: Bearer $API_KEY" \
            -H "Content-Type: application/json" \
            "$API_BASE_URL$endpoint")
    else
        response=$(curl -s -X "$method" \
            -H "Authorization: Bearer $API_KEY" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE_URL$endpoint")
    fi

    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
}

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
api_request "GET" "/health"

# Test 2: Create Contact
echo -e "${YELLOW}Test 2: Create Contact${NC}"
CONTACT_DATA='{
  "email": "test@example.com",
  "phone": "+1234567890",
  "whatsappId": "1234567890",
  "firstName": "John",
  "lastName": "Doe",
  "preferences": {
    "preferredChannel": "email",
    "optOutSms": false
  }
}'
CONTACT_RESPONSE=$(api_request "POST" "/contacts" "$CONTACT_DATA")
CONTACT_ID=$(echo "$CONTACT_RESPONSE" | jq -r '.data.contactId' 2>/dev/null)

# Test 3: Get Contact
if [ ! -z "$CONTACT_ID" ] && [ "$CONTACT_ID" != "null" ]; then
    echo -e "${YELLOW}Test 3: Get Contact${NC}"
    api_request "GET" "/contacts/$CONTACT_ID"
fi

# Test 4: Send Email
echo -e "${YELLOW}Test 4: Send Email${NC}"
EMAIL_DATA='{
  "channel": "email",
  "to": "test@example.com",
  "subject": "Test Email from AirPay Messenger",
  "body": "This is a test email sent via the API.",
  "html": "<h1>Test Email</h1><p>This is a test email sent via the API.</p>",
  "metadata": {
    "source": "api-test",
    "testId": "email-001"
  }
}'
EMAIL_RESPONSE=$(api_request "POST" "/messages/send" "$EMAIL_DATA")
EMAIL_MESSAGE_ID=$(echo "$EMAIL_RESPONSE" | jq -r '.data.messageId' 2>/dev/null)

# Test 5: Send SMS
echo -e "${YELLOW}Test 5: Send SMS${NC}"
SMS_DATA='{
  "channel": "sms",
  "to": "+1234567890",
  "body": "Test SMS from AirPay Messenger. Your code is: 123456",
  "metadata": {
    "source": "api-test",
    "testId": "sms-001"
  }
}'
SMS_RESPONSE=$(api_request "POST" "/messages/send" "$SMS_DATA")
SMS_MESSAGE_ID=$(echo "$SMS_RESPONSE" | jq -r '.data.messageId' 2>/dev/null)

# Test 6: Send WhatsApp
echo -e "${YELLOW}Test 6: Send WhatsApp${NC}"
WHATSAPP_DATA='{
  "channel": "whatsapp",
  "to": "1234567890",
  "body": "Test WhatsApp message from AirPay Messenger!",
  "metadata": {
    "source": "api-test",
    "testId": "whatsapp-001"
  }
}'
api_request "POST" "/messages/send" "$WHATSAPP_DATA"

# Test 7: Send Email with CC and BCC
echo -e "${YELLOW}Test 7: Send Email with CC/BCC${NC}"
EMAIL_CC_DATA='{
  "channel": "email",
  "to": "test@example.com",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "subject": "Test Email with CC/BCC",
  "body": "This email has CC and BCC recipients.",
  "html": "<p>This email has CC and BCC recipients.</p>"
}'
api_request "POST" "/messages/send" "$EMAIL_CC_DATA"

# Test 8: Schedule Message
echo -e "${YELLOW}Test 8: Schedule Message${NC}"
FUTURE_DATE=$(date -u -v+2H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+2 hours" +"%Y-%m-%dT%H:%M:%SZ")
SCHEDULED_DATA='{
  "channel": "email",
  "to": "test@example.com",
  "subject": "Scheduled Email",
  "body": "This email was scheduled for delivery.",
  "scheduledAt": "'$FUTURE_DATE'"
}'
api_request "POST" "/messages/send" "$SCHEDULED_DATA"

# Test 9: Get Message Status
if [ ! -z "$EMAIL_MESSAGE_ID" ] && [ "$EMAIL_MESSAGE_ID" != "null" ]; then
    echo -e "${YELLOW}Test 9: Get Message Status${NC}"
    api_request "GET" "/messages/$EMAIL_MESSAGE_ID/status"
fi

# Test 10: Get Message History
if [ ! -z "$CONTACT_ID" ] && [ "$CONTACT_ID" != "null" ]; then
    echo -e "${YELLOW}Test 10: Get Message History${NC}"
    api_request "GET" "/messages?contactId=$CONTACT_ID&limit=10"
fi

# Test 11: List Contacts
echo -e "${YELLOW}Test 11: List Contacts${NC}"
api_request "GET" "/contacts?limit=10&offset=0"

# Test 12: Update Contact
if [ ! -z "$CONTACT_ID" ] && [ "$CONTACT_ID" != "null" ]; then
    echo -e "${YELLOW}Test 12: Update Contact${NC}"
    UPDATE_DATA='{
      "firstName": "Jane",
      "metadata": {
        "updated": true,
        "lastTest": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
      }
    }'
    api_request "PUT" "/contacts/$CONTACT_ID" "$UPDATE_DATA"
fi

# Test 13: Search Contacts
echo -e "${YELLOW}Test 13: Search Contacts${NC}"
api_request "GET" "/contacts?search=test&limit=5"

# Test 14: Update Contact Preferences
if [ ! -z "$CONTACT_ID" ] && [ "$CONTACT_ID" != "null" ]; then
    echo -e "${YELLOW}Test 14: Update Contact Preferences${NC}"
    PREFERENCES_DATA='{
      "preferredChannel": "whatsapp",
      "optOutEmail": false,
      "optOutSms": true,
      "optOutWhatsapp": false
    }'
    api_request "PUT" "/contacts/$CONTACT_ID/preferences" "$PREFERENCES_DATA"
fi

# Test 15: Opt-Out
echo -e "${YELLOW}Test 15: Opt-Out${NC}"
OPTOUT_DATA='{
  "identifier": "test@example.com",
  "channel": "email"
}'
api_request "POST" "/contacts/opt-out" "$OPTOUT_DATA"

# Summary
echo ""
echo "================================================"
echo "Test Summary"
echo "================================================"
echo ""
echo -e "Contact ID: ${GREEN}$CONTACT_ID${NC}"
echo -e "Email Message ID: ${GREEN}$EMAIL_MESSAGE_ID${NC}"
echo -e "SMS Message ID: ${GREEN}$SMS_MESSAGE_ID${NC}"
echo ""
echo "All tests completed!"
echo ""
echo "To view detailed logs:"
echo "  docker-compose logs -f api"
echo ""
echo "To check queue status:"
echo "  docker-compose exec redis redis-cli keys 'bull:*'"
echo ""
