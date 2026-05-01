from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_contact_form(request):
    try:
        message = request.data.get('message', '').strip()
        
        if not message:
            return Response({'error': 'Message cannot be empty'}, status=400)

        user_email = request.user.email
        user_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username

        subject = f"HEMS Contact Us Submission from {user_name}"
        body = f"User: {user_name} ({user_email})\n\nMessage:\n{message}"
        
        send_mail(
            subject=subject,
            message=body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@arkaenergy.com'),
            recipient_list=['hitarthkhatiwala@gmail.com'],
            fail_silently=False,
        )

        return Response({'success': True, 'message': 'Message sent successfully.'})
    
    except Exception as e:
        logger.error(f"Failed to send contact email: {e}")
        return Response({'error': 'Failed to send message. Please try again later.'}, status=500)
