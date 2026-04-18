const express = require('express');
const router = express.Router();

// Contextual response engine for the Cibelle Concierge
const KNOWLEDGE_BASE = [
    {
        keywords: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'good night', 'namaste'],
        responses: [
            "Good evening. Welcome to Cibelle — your personal concierge is at your service. How may I assist your culinary journey tonight?",
            "A pleasure to have you. I am your dedicated dining concierge. Shall we begin crafting your perfect experience?"
        ]
    },
    {
        keywords: ['reserve', 'reservation', 'book', 'table', 'booking', 'private dining'],
        responses: [
            "Exceptional choice. Private dining reservations at Cibelle are available Friday through Sunday, with exclusive time slots from 18:00 to 22:30. Scroll down to our reservation section to select your preferred date and occasion.",
            "Our private dining experiences are curated for the discerning guest. I recommend securing a slot at least 3 days in advance — availability is extremely limited. Shall I guide you to the reservation flow?"
        ]
    },
    {
        keywords: ['menu', 'food', 'dish', 'what to eat', 'recommend', 'suggestion', 'best'],
        responses: [
            "The Dal Bukhara at Bukhara has been a celebrated mainstay for over four decades — a slow-cooked black lentil preparation that has graced the tables of heads of state. Alternatively, the Wasabi Prawn at Wasabi by Morimoto is an unparalleled experience.",
            "Our Chef's Signature items rotate seasonally. Tonight I would particularly recommend exploring the tasting menus — they offer the most complete expression of each kitchen's philosophy."
        ]
    },
    {
        keywords: ['membership', 'elite', 'gold', 'silver', 'tier', 'upgrade', 'vip', 'exclusive'],
        responses: [
            "The Cibelle Elite membership grants you unrestricted access to all establishments, guaranteed priority reservations, and a personal 24-hour concierge line. Upgrading takes moments — visit your membership portal from the navigation above.",
            "Your current membership tier defines which culinary worlds are open to you. Elite members may also access invitation-only seasonal galas and private chef home dining. Shall I take you to the membership page?"
        ]
    },
    {
        keywords: ['delivery', 'time', 'how long', 'estimated', 'minutes', 'fast'],
        responses: [
            "Delivery windows vary by establishment — typically 35 to 75 minutes from confirmation. Our concierge delivery service ensures white-glove handling at every step.",
            "For our premium establishments, delivery is handled by dedicated Cibelle Ambassadors — not standard couriers. Your selection arrives exactly as it left the kitchen."
        ]
    },
    {
        keywords: ['price', 'cost', 'expensive', 'affordable', 'how much', 'charge', 'fee'],
        responses: [
            "Our curated establishments range from ₹1,800 to ₹7,500 per head. The experience, however, is without peer. All pricing is transparent — no hidden surcharges beyond the concierge delivery fee.",
            "Cibelle operates on a philosophy of value for the extraordinary. Every rupee spent reflects in the quality of ingredient, preparation, and presentation delivered to you."
        ]
    },
    {
        keywords: ['vegetarian', 'veg', 'vegan', 'plant', 'no meat', 'no chicken', 'dietary'],
        responses: [
            "Several of our finest establishments offer world-class vegetarian selections — Indian Accent and Gaggan Anand are particularly celebrated for their plant-forward innovations. I can filter the menu grid to show only vegetarian options if you prefer.",
            "Your dietary preferences are our priority. All items carry clear Veg or Non-Veg designations, and our chefs accommodate custom requests with advance notice via the reservation notes."
        ]
    },
    {
        keywords: ['cancel', 'cancellation', 'refund', 'change', 'modify'],
        responses: [
            "Reservations may be modified up to 4 hours before the scheduled time without penalty. Please contact our team at concierge@cibelle.com or use the reservation ID from your confirmation.",
            "We understand plans change. Our cancellation policy allows full flexibility up to the day of experience — a testament to our commitment to your peace of mind."
        ]
    },
    {
        keywords: ['occasion', 'anniversary', 'birthday', 'proposal', 'romantic', 'celebrate', 'celebration'],
        responses: [
            "A momentous occasion deserves an unforgettable setting. I recommend a private candlelit table at Indian Accent — our team can arrange floral arrangements, curated champagne pairings, and a bespoke dessert presentation. Shall I prepare a reservation?",
            "Celebrations at Cibelle are crafted down to the last detail. Our concierge team coordinates the ambience, the music, and the menu — you need only arrive."
        ]
    },
    {
        keywords: ['thank', 'thanks', 'great', 'perfect', 'wonderful', 'excellent', 'amazing'],
        responses: [
            "The privilege is entirely ours. Is there anything further I may arrange for you this evening?",
            "It is our honour to serve you. Do not hesitate to return should you require anything — your concierge is always present."
        ]
    },
    {
        keywords: ['bye', 'goodbye', 'see you', 'leaving', 'exit'],
        responses: [
            "Until next time. May your evening be as exceptional as your palate. Bon appétit.",
            "A pleasure, as always. We look forward to your return. Safe travels."
        ]
    }
];

const FALLBACK_RESPONSES = [
    "A most intriguing request. Allow me a moment to consult our maître d'... In the meantime, may I suggest exploring our featured establishments above — each has been personally vetted for the Cibelle standard.",
    "I appreciate your query. For the most precise guidance, I recommend reaching our team directly at concierge@cibelle.com — they are available around the clock for Elite members.",
    "That falls slightly beyond my immediate expertise, but rest assured our human concierge team is available to assist. Shall I note your question for follow-up?",
    "An excellent question. Our dining curators would be best placed to answer that. May I suggest browsing the menu section while I escalate this to the team?"
];

function getResponse(userMessage) {
    const lower = userMessage.toLowerCase().trim();
    
    for (const entry of KNOWLEDGE_BASE) {
        if (entry.keywords.some(kw => lower.includes(kw))) {
            const pool = entry.responses;
            return pool[Math.floor(Math.random() * pool.length)];
        }
    }
    
    return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

// POST /api/concierge/message
router.post('/message', (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required.' });
    }
    
    // Simulate a short thinking delay on the server side (300-900ms)
    const delay = 300 + Math.floor(Math.random() * 600);
    setTimeout(() => {
        res.json({ 
            reply: getResponse(message),
            timestamp: new Date().toISOString()
        });
    }, delay);
});

module.exports = router;
