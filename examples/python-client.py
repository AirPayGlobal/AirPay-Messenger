"""
AirPay Messenger - Python Client Example

This example demonstrates how to integrate AirPay Messenger
into your Python application.
"""

import requests
from typing import Optional, Dict, List, Any
from datetime import datetime


class AirPayMessenger:
    """Python client for AirPay Messenger API"""

    def __init__(self, api_key: str, base_url: str = "http://localhost:3000/api/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })

    def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        html: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None,
        scheduled_at: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Send an email message"""
        payload = {
            "channel": "email",
            "to": to,
            "subject": subject,
            "body": body,
        }

        if html:
            payload["html"] = html
        if cc:
            payload["cc"] = cc
        if bcc:
            payload["bcc"] = bcc
        if attachments:
            payload["attachments"] = attachments
        if scheduled_at:
            payload["scheduledAt"] = scheduled_at
        if metadata:
            payload["metadata"] = metadata

        return self._request("POST", "/messages/send", json=payload)

    def send_sms(
        self,
        to: str,
        body: str,
        scheduled_at: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Send an SMS message"""
        payload = {
            "channel": "sms",
            "to": to,
            "body": body
        }

        if scheduled_at:
            payload["scheduledAt"] = scheduled_at
        if metadata:
            payload["metadata"] = metadata

        return self._request("POST", "/messages/send", json=payload)

    def send_whatsapp(
        self,
        to: str,
        body: str,
        scheduled_at: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Send a WhatsApp message"""
        payload = {
            "channel": "whatsapp",
            "to": to,
            "body": body
        }

        if scheduled_at:
            payload["scheduledAt"] = scheduled_at
        if metadata:
            payload["metadata"] = metadata

        return self._request("POST", "/messages/send", json=payload)

    def send_with_template(
        self,
        channel: str,
        to: str,
        template_id: str,
        variables: Dict[str, str],
        scheduled_at: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Send message using a template"""
        payload = {
            "channel": channel,
            "to": to,
            "templateId": template_id,
            "templateVariables": variables
        }

        if scheduled_at:
            payload["scheduledAt"] = scheduled_at
        if metadata:
            payload["metadata"] = metadata

        return self._request("POST", "/messages/send", json=payload)

    def get_message_status(self, message_id: str) -> Dict:
        """Get message status"""
        return self._request("GET", f"/messages/{message_id}/status")

    def get_message_history(
        self,
        contact_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> Dict:
        """Get message history for a contact"""
        params = {
            "contactId": contact_id,
            "limit": limit,
            "offset": offset
        }
        return self._request("GET", "/messages", params=params)

    def create_contact(self, contact_data: Dict) -> Dict:
        """Create a new contact"""
        return self._request("POST", "/contacts", json=contact_data)

    def get_contact(self, contact_id: str) -> Dict:
        """Get contact by ID"""
        return self._request("GET", f"/contacts/{contact_id}")

    def update_contact(self, contact_id: str, updates: Dict) -> Dict:
        """Update a contact"""
        return self._request("PUT", f"/contacts/{contact_id}", json=updates)

    def list_contacts(
        self,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None
    ) -> Dict:
        """List contacts"""
        params = {"limit": limit, "offset": offset}
        if search:
            params["search"] = search

        return self._request("GET", "/contacts", params=params)

    def opt_out(self, identifier: str, channel: str) -> Dict:
        """Handle opt-out request"""
        payload = {
            "identifier": identifier,
            "channel": channel
        }
        return self._request("POST", "/contacts/opt-out", json=payload)

    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        json: Optional[Dict] = None
    ) -> Dict:
        """Make HTTP request to API"""
        url = f"{self.base_url}{endpoint}"

        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=json
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.HTTPError as e:
            error_data = e.response.json() if e.response.text else {}
            error_message = error_data.get("error", {}).get("message", str(e))
            raise Exception(f"API Error: {error_message}")

        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {str(e)}")


# ============================================================================
# Usage Examples
# ============================================================================

def examples():
    """Example usage of the AirPay Messenger client"""

    messenger = AirPayMessenger("your-api-key-here")

    # Example 1: Send a simple email
    try:
        result = messenger.send_email(
            to="user@example.com",
            subject="Welcome to AirPay!",
            body="Thank you for signing up.",
            html="<h1>Welcome to AirPay!</h1><p>Thank you for signing up.</p>"
        )
        print(f"Email sent: {result['data']['messageId']}")
    except Exception as e:
        print(f"Failed to send email: {e}")

    # Example 2: Send an SMS
    try:
        result = messenger.send_sms(
            to="+1234567890",
            body="Your verification code is: 123456"
        )
        print(f"SMS sent: {result['data']['messageId']}")
    except Exception as e:
        print(f"Failed to send SMS: {e}")

    # Example 3: Send WhatsApp message
    try:
        result = messenger.send_whatsapp(
            to="+1234567890",
            body="Hello from AirPay!"
        )
        print(f"WhatsApp sent: {result['data']['messageId']}")
    except Exception as e:
        print(f"Failed to send WhatsApp: {e}")

    # Example 4: Send email with attachment
    try:
        result = messenger.send_email(
            to="user@example.com",
            subject="Your Invoice",
            body="Please find your invoice attached.",
            attachments=[
                {
                    "fileName": "invoice.pdf",
                    "fileData": "base64-encoded-file-data",
                    "mimeType": "application/pdf"
                }
            ]
        )
        print(f"Email with attachment sent: {result['data']['messageId']}")
    except Exception as e:
        print(f"Failed to send email with attachment: {e}")

    # Example 5: Schedule a message
    try:
        from datetime import datetime, timedelta

        scheduled_time = datetime.now() + timedelta(hours=2)
        scheduled_time_iso = scheduled_time.isoformat()

        result = messenger.send_email(
            to="user@example.com",
            subject="Scheduled Message",
            body="This message was scheduled.",
            scheduled_at=scheduled_time_iso
        )
        print(f"Scheduled message: {result['data']['messageId']}")
    except Exception as e:
        print(f"Failed to schedule message: {e}")

    # Example 6: Use template
    try:
        result = messenger.send_with_template(
            channel="email",
            to="user@example.com",
            template_id="template-uuid",
            variables={
                "firstName": "John",
                "companyName": "AirPay"
            }
        )
        print(f"Template message sent: {result['data']['messageId']}")
    except Exception as e:
        print(f"Failed to send template message: {e}")

    # Example 7: Check message status
    try:
        status = messenger.get_message_status("message-uuid")
        print(f"Message status: {status['data']}")
    except Exception as e:
        print(f"Failed to get status: {e}")

    # Example 8: Create contact
    try:
        contact = messenger.create_contact({
            "email": "john@example.com",
            "phone": "+1234567890",
            "firstName": "John",
            "lastName": "Doe",
            "preferences": {
                "preferredChannel": "email",
                "optOutSms": False
            }
        })
        print(f"Contact created: {contact['data']['contactId']}")
    except Exception as e:
        print(f"Failed to create contact: {e}")

    # Example 9: Get message history
    try:
        history = messenger.get_message_history(
            contact_id="contact-uuid",
            limit=10,
            offset=0
        )
        print(f"Message history: {history['data']}")
    except Exception as e:
        print(f"Failed to get history: {e}")

    # Example 10: Django integration example
    def send_user_notification(user_id: int, message: str):
        """Example Django integration"""
        from django.contrib.auth.models import User

        try:
            user = User.objects.get(id=user_id)

            # Try to send via user's preferred channel
            if hasattr(user, 'profile') and user.profile.phone:
                result = messenger.send_sms(
                    to=user.profile.phone,
                    body=message
                )
            else:
                result = messenger.send_email(
                    to=user.email,
                    subject="Notification",
                    body=message
                )

            return result['data']['messageId']

        except Exception as e:
            print(f"Failed to send notification: {e}")
            return None

    # Example 11: Flask integration example
    def flask_send_welcome_email(user_email: str, user_name: str):
        """Example Flask integration"""
        try:
            result = messenger.send_with_template(
                channel="email",
                to=user_email,
                template_id="welcome-template-uuid",
                variables={
                    "userName": user_name,
                    "loginUrl": "https://yourapp.com/login"
                }
            )

            return {
                "success": True,
                "message_id": result['data']['messageId']
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# Context manager for automatic cleanup
class AirPayMessengerContext:
    """Context manager for AirPay Messenger client"""

    def __init__(self, api_key: str, base_url: str = "http://localhost:3000/api/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.messenger = None

    def __enter__(self):
        self.messenger = AirPayMessenger(self.api_key, self.base_url)
        return self.messenger

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.messenger and self.messenger.session:
            self.messenger.session.close()


# Usage with context manager
def context_manager_example():
    with AirPayMessengerContext("your-api-key") as messenger:
        result = messenger.send_email(
            to="user@example.com",
            subject="Test",
            body="Test message"
        )
        print(result)


if __name__ == "__main__":
    examples()
