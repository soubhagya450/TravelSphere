import os
import json
import logging
from flask import current_app
from groq import Groq
from app.models.hotel import Hotel

logger = logging.getLogger(__name__)

class ChatbotService:
    @classmethod
    def get_client(cls):
        api_key = current_app.config.get('GROQ_API_KEY') or os.getenv('GROQ_API_KEY')
        if not api_key:
            raise ValueError("Groq API Key is not configured.")
        return Groq(api_key=api_key)

    @classmethod
    def get_hotel_context_summary(cls):
        """Fetch active hotels from database to give accurate real-time context to the LLM."""
        try:
            hotels = Hotel.query.all()
            if not hotels:
                return "Currently no hotels are registered in the system."
            
            summary_lines = []
            for h in hotels:
                amenities = ", ".join(h.get_amenities_list()[:4]) if h.get_amenities_list() else "Standard amenities"
                summary_lines.append(
                    f"- ID {h.id}: '{h.name}' in {h.city} | Price: ₹{int(h.price_per_night)}/night | Rating: {h.rating}★ | Amenities: {amenities} | Link: /hotel-detail.html?id={h.id}"
                )
            return "\n".join(summary_lines)
        except Exception as e:
            logger.warning(f"Could not load hotel context from DB: {e}")
            return "Hotels are available in major cities including Mumbai, Goa, Delhi, Bengaluru, and Jaipur."

    @classmethod
    def build_system_prompt(cls, user_info=None):
        hotels_context = cls.get_hotel_context_summary()
        
        user_context_str = ""
        if user_info and user_info.get('name'):
            user_context_str = f"\nThe user currently logged in is: {user_info.get('name')} ({user_info.get('email', '')}). Greet them warmly by name."

        return f"""You are the official AI Travel Concierge for 'TravelSphere' (a modern real-time travel and hotel booking platform).
Your role is to help travelers discover destinations, find and book hotels, plan travel routes with live GPS tracking, and answer questions about the platform.

Here is the current verified live hotel catalog in TravelSphere database:
{hotels_context}

Platform Features & Navigation Links:
- Explore All Hotels: [Explore Hotels](/hotels.html)
- Live GPS Route Tracker & Map: [Live GPS Tracker](/dashboard.html)
- User Dashboard & Bookings: [My Bookings](/my-bookings.html)
- For any specific hotel mentioned from the catalog above, always provide a clickable markdown link using its exact relative link: e.g. [Hotel Name](/hotel-detail.html?id=ID).

Guidelines:
1. Always be welcoming, concise, helpful, and inspiring.
2. Recommend hotels strictly matching user criteria (budget, city, rating, amenities). When quoting prices, use Indian Rupees (₹).
3. If the user asks for a city or trip not directly in the catalog, provide helpful general travel advice and suggest checking the [Live Map Tracker](/dashboard.html) or [Explore Hotels](/hotels.html).
4. Format your responses nicely with markdown (bullet points, bold highlights, clickable links).
5. If the user asks about payments, mention we offer secure instant checkout via Razorpay and major credit/debit cards.{user_context_str}
"""

    @classmethod
    def chat(cls, message, history=None, user_info=None):
        """
        Sends the conversation history + new message to Groq.
        Tries primary model, then falls back to secondary model if needed.
        """
        client = cls.get_client()
        primary_model = current_app.config.get('GROQ_MODEL', 'openai/gpt-oss-120b')
        fallback_model = current_app.config.get('GROQ_FALLBACK_MODEL', 'qwen/qwen3.8-27b')

        system_prompt = cls.build_system_prompt(user_info)
        
        messages = [{'role': 'system', 'content': system_prompt}]

        # Append previous conversation history (safeguard last 10 messages)
        if history and isinstance(history, list):
            for h in history[-10:]:
                role = h.get('role')
                content = h.get('content')
                if role in ('user', 'assistant') and content:
                    messages.append({'role': role, 'content': str(content)})

        # Append current user prompt
        messages.append({'role': 'user', 'content': str(message)})

        # Try primary model
        models_to_try = [primary_model, fallback_model]
        last_error = None

        for model in models_to_try:
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=800
                )
                bot_reply = response.choices[0].message.content
                return {
                    'success': True,
                    'reply': bot_reply,
                    'model_used': model
                }
            except Exception as e:
                logger.error(f"Groq generation failed with model {model}: {e}")
                last_error = str(e)
                continue

        # If both fail
        raise RuntimeError(f"Chat completion failed across available models: {last_error}")

    @classmethod
    def get_suggestions(cls):
        """Returns starter prompt suggestions."""
        return [
            {"label": "🏖️ Best stays in Goa", "query": "Recommend the best luxury and beach hotels in Goa."},
            {"label": "🏙️ Mumbai under ₹6,000", "query": "Show me top rated hotels in Mumbai under ₹6,000 per night."},
            {"label": "🗺️ How live tracking works", "query": "How does the Live Route Tracker work in TravelSphere?"},
            {"label": "💳 Booking & Payment guide", "query": "How do I book a hotel and what payment options are supported?"}
        ]
