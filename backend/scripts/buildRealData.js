const fs = require('fs');
const path = require('path');

const restaurants = [
    { 
        id: '1', name: "Bukhara", cuisine: "NORTH INDIAN", 
        description: "An iconic culinary landmark celebrating the rustic flavors of the North-West Frontier.", 
        image_url: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=1200", 
        tag: "LEGENDARY CULINARY ICON", 
        story: "Stone-washed walls and low seating create a ruggedly elegant atmosphere where the tandoor is king.",
        rating: 4.9, deliveryFee: 250.0, priceForOne: 4500, time: "45-60 MINS", isVeg: false, isPremium: true, hasOffer: false 
    },
    { 
        id: '2', name: "Indian Accent", cuisine: "MODERN INDIAN", 
        description: "Manish Mehrotra's globally acclaimed reinterpretation of traditional Indian soul.", 
        image_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200", 
        tag: "ASIA'S BEST", 
        story: "A sophisticated manor setting where classic flavors are presented with playful modern artistry.",
        rating: 5.0, deliveryFee: 300.0, priceForOne: 6500, time: "60-90 MINS", isVeg: false, isPremium: true, hasOffer: false 
    },
    { 
        id: '3', name: "Wasabi by Morimoto", cuisine: "JAPANESE", 
        description: "The peak of Japanese fine dining at the iconic Taj Mahal Palace.", 
        image_url: "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&q=80&w=1200", 
        tag: "SIGNATURE EXPERIENCE", 
        story: "Overlooking the Gateway of India, this sanctuary offers the freshest ingredients flown from Tokyo.",
        rating: 4.9, deliveryFee: 400.0, priceForOne: 8000, time: "50-70 MINS", isVeg: false, isPremium: true, hasOffer: false 
    },
    { 
        id: '4', name: "Dum Pukht", cuisine: "AWADHI MUGHLAI", 
        description: "The royal art of slow cooking, revived from the kitchens of the Nawabs.", 
        image_url: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&q=80&w=1200", 
        tag: "ROYAL HERITAGE", 
        story: "Blue and silver decor mirrors the refined elegance of the Lucknowi courts.",
        rating: 4.8, deliveryFee: 200.0, priceForOne: 5000, time: "60-80 MINS", isVeg: false, isPremium: true, hasOffer: false 
    },
    { 
        id: '5', name: "Masque", cuisine: "CONTEMPORARY INDIAN", 
        description: "A progressive laboratory focused on India's vast biodiversity and micro-seasons.", 
        image_url: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&q=80&w=1200", 
        tag: "INNOVATIVE TABLE", 
        story: "Industrial chic meets Himalayan foraging in this former Mumbai mill.",
        rating: 4.9, deliveryFee: 350.0, priceForOne: 7500, time: "50-80 MINS", isVeg: false, isPremium: true, hasOffer: false 
    },
    { 
        id: '6', name: "Karavalli", cuisine: "SOUTH INDIAN COASTAL", 
        description: "Traditional recipes from the coconut-fringed coasts of South India.", 
        image_url: "https://images.unsplash.com/photo-1589187151032-573a9131cb2e?auto=format&fit=crop&q=80&w=1200", 
        tag: "COASTAL TREASURE", 
        story: "Tile-roofed architecture nestled in a lush garden, celebrating Mangalorean and Goan soul.",
        rating: 4.9, deliveryFee: 250.0, priceForOne: 3500, time: "45-65 MINS", isVeg: false, isPremium: true, hasOffer: false 
    },
    { 
        id: '7', name: "Suvarna Mahal", cuisine: "RAJASTHANI ROYAL", 
        description: "Dine like a Maharaja under gilded ceilings and crystal chandeliers.", 
        image_url: "https://images.unsplash.com/photo-1590073242678-70ee3fc28e84?auto=format&fit=crop&q=80&w=1200", 
        tag: "PALACE DINING", 
        story: "The former royal ballroom of the Rambagh Palace, featuring gold-plated silver service.",
        rating: 5.0, deliveryFee: 500.0, priceForOne: 12000, time: "60-100 MINS", isVeg: true, isPremium: true, hasOffer: true, offerText: "PRIVATE BUTLER"
    },
    { 
        id: '8', name: "Avartana", cuisine: "MODERN SOUTH INDIAN", 
        description: "A mystical journey of Southern flavors reimagined with avant-garde flair.", 
        image_url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=1200", 
        tag: "AVANT-GARDE", 
        story: "A serene, monochromatic space where traditional ingredients find new futuristic forms.",
        rating: 4.8, deliveryFee: 280.0, priceForOne: 5500, time: "55-75 MINS", isVeg: false, isPremium: true, hasOffer: false 
    },
    { 
        id: '9', name: "The Table", cuisine: "GLOBAL CONTEMPORARY", 
        description: "Farm-to-table excellence in the heart of South Mumbai.", 
        image_url: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=1200", 
        tag: "CAPE COD STYLE", 
        story: "A stylish two-level space with a vibrant energy and an obsession with ingredient quality.",
        rating: 4.7, deliveryFee: 150.0, priceForOne: 3000, time: "30-50 MINS", isVeg: false, isPremium: true, hasOffer: false 
    },
    { 
        id: '10', name: "Megu", cuisine: "MODERN JAPANESE", 
        description: "A spectacular glass Buddha overlooks this temple of refined Japanese taste.", 
        image_url: "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&q=80&w=1200", 
        tag: "ZEN ELEGANCE", 
        story: "Exquisite kimonos and dramatic architectural details set the stage for master-crafted sushi.",
        rating: 4.8, deliveryFee: 300.0, priceForOne: 7000, time: "45-65 MINS", isVeg: false, isPremium: true, hasOffer: false 
    }
];

const cuisineNouns = {
    "NORTH INDIAN": ["Paneer Tikka", "Butter Chicken", "Dal Makhani", "Tandoori Jhinga", "Tandoori Roti", "Butter Naan", "Kebabs", "Chicken Tikka", "Malai Kofta"],
    "MODERN INDIAN": ["Meetha Achaar Ribs", "Duck Khurchan", "Soy Keema", "Truffle Naan", "Prawn Gujiya", "Paper Roast Dosa", "Blue Cheese Kulcha"],
    "JAPANESE": ["Sushi Roll", "Sashimi", "Wagyu Skewers", "Miso Black Cod", "Tempura", "Ramen", "Matcha Fondant", "Edamame Truffle"],
    "AWADHI MUGHLAI": ["Galouti Kebab", "Kakori Kebab", "Lucknowi Biryani", "Shahi Tukda", "Nihari", "Warqi Paratha", "Dum Ka Murgh"],
    "CONTEMPORARY INDIAN": ["Foraged Mushrooms", "Goat Cheese Kulcha", "Duck Confit Samosa", "Lobster Moilee", "Pork Belly Vindaloo"],
    "SOUTH INDIAN COASTAL": ["Appam", "Meen Moilee", "Prawn Ghee Roast", "Chicken Sukka", "Neer Dosa", "Alleppey Curry", "Crab Masala"],
    "RAJASTHANI ROYAL": ["Laal Maas", "Ker Sangri", "Gatte Ki Sabzi", "Bajra Roti", "Dal Baati Churma", "Jungli Maas", "Malpua"],
    "MODERN SOUTH INDIAN": ["Asparagus Coconut Soup", "Scallop Rasam", "Saffron Idiyappam", "Lobster Thengai Paal", "Infused Buttermilk"],
    "GLOBAL CONTEMPORARY": ["Burrata", "Truffle Fries", "Black Rice Salad", "Lamb Shank", "Sea Bass", "Zucchini Pasta", "Panna Cotta"]
};

const descriptors = ["Gold-Leafed", "Saffron-infused", "Tandoor-charred", "Spiced", "Slow-cooked", "Ghee-roasted", "Truffle-scented", "Artisanal", "Royal", "Nawabi", "Coastal", "Hand-crafted"];
const accompaniments = ["with Burhani Raita", "in Makhani Gravy", "with Garlic Naan", "with Saffron Pulao", "with Malabar Parotta", "and Mint Chutney", "with Truffle Kulcha", "in Desi Ghee"];

const signatures = {
    '1': ["Dal Bukhara", "Sikandari Mutton Raan", "Tandoori Jhinga", "Naan Bukhara"],
    '2': ["Blue Cheese Kulcha", "Baked Bikaneri Paneer", "Soy Keema with Quail Egg"],
    '3': ["Black Cod Miso", "Rock Shrimp Tempura", "Yellowtail Jalapeño"],
    '4': ["Dum Pukht Biryani", "Kakori Kebab", "Nihari Khaas"],
    '5': ["Foraged Himalayan Mushrooms", "Mishti Doi Tart", "Slow-cooked Lamb"],
    '6': ["Meen Moilee", "Tiger Prawns with Kokum", "Coorg Pandi Curry"],
    '7': ["Laal Maans", "Ker Sangri", "Safed Maas"],
    '8': ["Asparagus with Coconut", "Infused Rasam", "Braised Lamb with Curry Leaves"],
    '9': ["Table Sliders", "Truffle Fries", "Mushroom Risotto"],
    '10': ["Salmon Tartare", "Wagyu in Hot Stone", "Green Tea Cake"]
};

let menuItems = [];

function getImage(name, isVeg) {
    let n = name.toLowerCase();
    if (n.match(/(chicken|mutton|lamb|meat|fish|shrimp|prawn|jhinga|kabab|kebab|duck|pork|maas|raan|egg)/)) {
        return 'img/beef.png'; // Using existing placeholders
    } else if (n.match(/(dessert|malpua|tukda|cake|tart|fondant|panna|sweet)/)) {
        return 'img/dessert.png';
    } else {
        return 'img/vegetarian.png';
    }
}

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

restaurants.forEach(r => {
    let currentItemCount = 0;
    const isRestVeg = r.cuisine.includes("VEGAN") || r.name.includes("Avartana"); // Some assumptions
    
    if (signatures[r.id]) {
        signatures[r.id].forEach(sig => {
            currentItemCount++;
            const n = sig.toLowerCase();
            const veg = isRestVeg || n.match(/(paneer|dal|kulcha|naan|moshroom|aspargus|mishit|tart|potato|fries|risotto|soup|infused)/) && !n.match(/(chicken|meat|lamb|mutton|fish|jhinga|prawn)/);
            menuItems.push({
                id: `menu_${r.id}_${currentItemCount}`,
                restaurant_id: r.id,
                name: sig,
                description: `Signature world-renowned dish representing the pinnacle of ${r.cuisine} gastronomy.`,
                price: parseFloat((Math.random() * (4000 - 800) + 800).toFixed(2)),
                image_url: getImage(sig, veg),
                is_veg: !!veg
            });
        });
    }

    const baseNouns = cuisineNouns[r.cuisine] || cuisineNouns["NORTH INDIAN"];
    
    while(currentItemCount < 50) {
        currentItemCount++;
        const noun = randItem(baseNouns);
        const name = `${randItem(descriptors)} ${noun} ${randItem(accompaniments)}`;
        const n = name.toLowerCase();
        const veg = isRestVeg || n.match(/(paneer|dal|kulcha|naan|moshroom|aspargus|mishit|tart|potato|fries|risotto|soup|infused)/) && !n.match(/(chicken|meat|lamb|mutton|fish|jhinga|prawn)/);
        
        menuItems.push({
            id: `menu_${r.id}_${currentItemCount}`,
            restaurant_id: r.id,
            name: name,
            description: `Authentic ${r.cuisine} delicacy, crafted with precision and the finest seasonal ingredients.`,
            price: parseFloat((Math.random() * (2500 - 600) + 600).toFixed(2)),
            image_url: getImage(name, veg),
            is_veg: !!veg
        });
    }
});

const database = {
    restaurants: restaurants,
    menuItems: menuItems
};

const outputDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'cibelle_database.json'), JSON.stringify(database, null, 2));

console.log(`✅ Successfully generated cibelle_database.json with ${restaurants.length} Indian Luxury Restaurants and ${menuItems.length} Real Menu Items.`);
