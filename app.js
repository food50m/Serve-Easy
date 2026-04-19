/* FOOD 50m - Main Application Logic
  Version: 1.1.1 (Official Launch)
  Description: Handles geolocation, restaurant listing, menu fetching, and order placement.
*/


const API = "https://script.google.com/macros/s/AKfycbyg4XacE-2pRFqD2sD5PiD9pRBt8XLsPQlhOZ7sR6C6DkgusoLp3t5ulNC0qwRFYCDj/exec";

// -------------------------------
// GLOBAL STATE
// -------------------------------
let userLat = null;
let userLng = null;
let allRestaurants = []; 
let menuCache = {};      
let cart = [];           

// -------------------------------
// 1. CART & UI UPDATES
// -------------------------------

function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ id, name, price: Number(price), qty: 1 });
    }
    updateCartUI();
}

function viewCart() {
    const currentResId = sessionStorage.getItem("current_res_id");
    const currentResName = sessionStorage.getItem("current_res_name") || "Menu";
    openMenu(currentResId, currentResName);
}

function updateCartUI() {
    let cartBar = document.getElementById("cart-bar");
    if (!cartBar) {
        cartBar = document.createElement("div");
        cartBar.id = "cart-bar";
        cartBar.style = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            width: 90%; max-width: 500px; background: #1e293b; color: white;
            padding: 15px 20px; border-radius: 20px; display: flex;
            justify-content: space-between; align-items: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 1000;
        `;
        document.body.appendChild(cartBar);
    }

    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const isCheckoutVisible = document.getElementById("cust_name") !== null;

    if (totalQty > 0 && !isCheckoutVisible) {
        cartBar.innerHTML = `
            <div onclick="checkout()" style="cursor:pointer; display:flex; align-items:center;">
                <span style="font-weight: 800; background: var(--primary); padding: 2px 8px; border-radius: 5px; margin-right: 10px;">${totalQty}</span>
                <span style="text-decoration: underline;">View Cart</span>
            </div>
            <div style="font-weight: 800;">₹${totalPrice}</div>
            <button onclick="checkout()" style="background: var(--primary); border: none; color: white; padding: 8px 15px; border-radius: 10px; font-weight: bold; cursor: pointer;">Next ⮕</button>
        `;
        cartBar.style.display = 'flex';
    } else {
        cartBar.style.display = 'none';
    }
}

// -------------------------------
// 2. CHECKOUT & PAYMENT SELECTION
// -------------------------------

function checkout() {
    const out = document.getElementById("out");
    const oldName = document.getElementById("cust_name")?.value || localStorage.getItem("user_name") || "";
    const oldPhone = document.getElementById("cust_phone")?.value || localStorage.getItem("user_phone") || "";
    const oldNote = document.getElementById("cust_note")?.value || "";

    if (document.getElementById("cart-bar")) document.getElementById("cart-bar").style.display = 'none';

    let total = cart.reduce((sum, item) => sum + (item.qty * item.price), 0);
    let html = `
        <div style="padding: 10px;">
            <h2 style="color: var(--primary); text-align: center;">Finalize Order</h2>
            <div style="background: white; border-radius: 15px; padding: 15px; box-shadow: var(--shadow); margin-bottom: 15px;">
                <p style="font-weight:bold; color:var(--text-light); margin-top:0; margin-bottom:10px;">Contact Details</p>
                <input id="cust_name" type="text" placeholder="Your Name" value="${oldName}" style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #eee; border-radius:10px; box-sizing:border-box;">
                <input id="cust_phone" type="tel" placeholder="Mobile Number" value="${oldPhone}" style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #eee; border-radius:10px; box-sizing:border-box;">
                <textarea id="cust_note" placeholder="Special Instructions (Optional)" style="width:100%; padding:12px; border:1px solid #eee; border-radius:10px; box-sizing:border-box; height: 60px; font-family: inherit; margin-bottom:10px;">${oldNote}</textarea>
                <p style="font-weight:bold; color:var(--text-light); margin-bottom:8px;">Select Payment Mode:</p>
                <select id="pay_mode" style="width:100%; padding:12px; border:1px solid #eee; border-radius:10px; background:#f8fafc; font-weight:600; cursor:pointer;">
                        <option value="Online">📲 Online (GPay/PhonePe)</option>
                </select>
            </div>
            <div style="background: white; border-radius: 15px; padding: 15px; box-shadow: var(--shadow);">
                <p style="font-weight:bold; color:var(--text-light); margin-top:0;">Order Summary</p>
    `;

    cart.forEach((item, index) => {
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #fafafa; padding-bottom: 8px;">
                <div style="flex: 1;">
                    <div style="font-weight:600;">${item.name}</div>
                    <div style="font-size: 0.9rem; color: var(--primary);">₹${item.price}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button onclick="changeQty(${index}, -1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #ddd; background:white;">-</button>
                    <span style="font-weight:bold;">${item.qty}</span>
                    <button onclick="changeQty(${index}, 1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #ddd; background:white;">+</button>
                </div>
            </div>`;
    });

    html += `
                <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 1.2rem; font-weight: 900; color: var(--primary);">
                    <span>Total:</span><span>₹${total}</span>
                </div>
            </div>
            <button id="finalOrderBtn" onclick="placeFinalOrder()" style="margin-top: 25px; width: 100%; padding: 18px; background: #22c55e; color: white; border: none; border-radius: 16px; font-weight: 800; font-size: 1.1rem; cursor: pointer;">
                Confirm Order ✅
            </button>
            <button onclick="viewCart()" style="margin-top: 15px; width: 100%; background:none; border:none; color:gray; cursor:pointer; font-weight:600;">⬅ Edit Items</button>
        </div>`;
    out.innerHTML = html;
}

function changeQty(index, amount) {
    cart[index].qty += amount;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    if (cart.length === 0) viewCart(); else checkout();
}

// -------------------------------
// 3. FINAL ORDER & WHATSAPP
// -------------------------------

function placeFinalOrder() {
    const name = document.getElementById("cust_name").value;
    const phone = document.getElementById("cust_phone").value;
    const note = document.getElementById("cust_note").value;
    const payMode = document.getElementById("pay_mode").value;

    if (!name || !phone) { alert("Please enter name and phone!"); return; }

    const btn = document.getElementById("finalOrderBtn");
    if(btn) { btn.disabled = true; btn.innerText = "Processing..."; }

    localStorage.setItem("user_name", name);
    localStorage.setItem("user_phone", phone);

    const out = document.getElementById("out");
    const selectedRestaurantId = sessionStorage.getItem("current_res_id");
    const hotelWhatsApp = sessionStorage.getItem("current_res_wa") || "910000000000";
    const itemsString = cart.map(item => `${item.qty}x ${item.name}`).join(", ");
    const totalAmount = cart.reduce((sum, item) => sum + (item.qty * item.price), 0);

    out.innerHTML = `<div style="text-align:center; padding:50px;"><p>Sending your order... 🚀</p></div>`;

    // POST request specifically formatted for Google Apps Script
    fetch(API + "?action=createOrder", {
        method: "POST",
        body: JSON.stringify({
            restaurant_id: selectedRestaurantId,
            items: itemsString,
            total: totalAmount,
            customer_name: name,
            customer_phone: phone,
            payment_mode: payMode,  
            notes: note  
        })
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            showPaymentForm(res.order_id, totalAmount, hotelWhatsApp);
            cart = []; 
        } else { 
            alert("Error placing order: " + (res.error || "Unknown error")); 
            checkout(); 
        }
    })
    .catch(err => { 
        console.error("Order Fetch Error:", err); 
        alert("Server connection failed. Please try again.");
        checkout(); 
    });
}
// -------------------------------
// 4. GEOLOCATION & LISTING
// -------------------------------

function filterRestaurants() {
    const q = document.getElementById("search").value.toLowerCase();
    if (q.trim() === "") {
        loadRestaurants(); 
    } else {
        const matched = allRestaurants.filter(r => 
            r.name.toLowerCase().includes(q) || r.cuisines.toLowerCase().includes(q)
        );
        renderRestaurants(matched); 
    }
}

function loadRestaurants() {
    const out = document.getElementById("out");
    
    fetch(API + "?action=getAllRestaurants")
    .then(r => r.json())
    .then(data => {
        // CHECK: If data is an error object instead of an array
        if (!Array.isArray(data)) {
            console.error("Script Error:", data.error || "Unknown Script Error");
            out.innerHTML = `<div style="text-align:center; padding:20px;">
                <p style="color:red;">Server Error: ${data.error || 'Check Spreadsheet'}</p>
            </div>`;
            return; 
        }

        // Only run this if data is confirmed to be an array
        allRestaurants = [];
        data.forEach(r => {
            const [id, name, user, pass, lat, lng, enabled, o_id, m_id, wa, cuisines] = r;
            if (String(enabled).toUpperCase() !== "YES") return;
            const distance = getDistanceKm(userLat, userLng, Number(lat), Number(lng));
            allRestaurants.push({
                restaurant_id: id, name: name, distance: distance, whatsapp: wa, cuisines: cuisines || ""
            });
        });
        allRestaurants.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        renderRestaurants(allRestaurants);
    })
    .catch(err => {
        console.error("Fetch Error:", err);
        out.innerHTML = `<p style="color:red; text-align:center;">Connection Failed</p>`;
    });
}
function renderRestaurants(list) {
    const out = document.getElementById("out");
    out.innerHTML = "";
    if (!list.length) { out.innerHTML = `<div class="empty"><p>No hotels found.</p></div>`; return; }
    list.forEach(r => {
        const div = document.createElement("div");
        div.className = "restaurant";
        const distLabel = (userLat && r.distance !== null) ? (r.distance < 1 ? (r.distance * 1000).toFixed(0) + "m" : r.distance.toFixed(1) + "km") : "";
        div.innerHTML = `<div class="restaurant-name">${r.name}</div><div class="distance-tag">${distLabel}</div>`;
        div.onclick = () => openMenu(r.restaurant_id, r.name);
        out.appendChild(div);
    });
}

// -------------------------------
// 5. MENU FETCHING & RENDERING
// -------------------------------

function openMenu(id, name) {
    const resData = allRestaurants.find(r => r.restaurant_id === id);
    if (resData) sessionStorage.setItem("current_res_wa", resData.whatsapp);
    sessionStorage.setItem("current_res_id", id);
    sessionStorage.setItem("current_res_name", name);

    const out = document.getElementById("out");
    const searchCont = document.querySelector('.search-container');
    if(searchCont) searchCont.style.display = 'none';

    out.innerHTML = `<div style="text-align:center; padding:50px; color:var(--text-light);"><p>🍱 Fetching menu...</p></div>`;

    // Added Cache Buster to prevent loading old menu data
    const menuUrl = `${API}?action=getMenu&restaurant_id=${id}&t=${new Date().getTime()}`;

    fetch(menuUrl)
    .then(r => r.json())
    .then(items => renderMenuItems(name, items))
    .catch(err => {
        console.error("Menu Error:", err);
        out.innerHTML = `<div style="text-align:center; padding:50px;"><p style="color:red;">Error loading menu.</p><button onclick="openMenu('${id}', '${name}')" style="padding:10px 20px; border-radius:10px; border:none; background:var(--primary); color:white;">Retry</button></div>`;
    });
}
// -------------------------------
// 6.RENDER MENU FUCTION 
// -------------------------------
// function renderMenuItems(hotelName, items) {
//     const out = document.getElementById("out");
//     let html = `<div style="text-align:center; padding: 10px;"><h2 style="color: var(--primary);">${hotelName}</h2></div>`;
    
//     items.forEach(item => {
//         // --- NEW LOGIC START ---
//         const status = (item.status || "").toLowerCase();
//         const isSoldOut = status === "sold out";
//         const isOff = status === "off" || status === "no"; // Added check for "off" or "no"
//         const isNotAvailable = isSoldOut || isOff;
        
//         const isBestSeller = status === "best seller";
//         // --- NEW LOGIC END ---

//         const safeName = item.name.replace(/'/g, "\\'");
        
//         // Grey out the row if it's sold out OR set to off
//         const rowStyle = isNotAvailable ? "background: #f1f5f9; opacity: 0.6; filter: grayscale(0.8);" : "background: white;";

//         html += `
//             <div class="restaurant" style="${rowStyle} border-left: 4px solid ${isNotAvailable ? '#cbd5e1' : 'var(--primary)'}; margin-bottom: 12px; padding: 15px; border-radius: 12px;">
//                 <div style="display: flex; justify-content: space-between; align-items:center;">
//                     <div style="flex: 1;">
//                         <div style="display: flex; align-items: center; gap: 8px;">
//                             <div class="restaurant-name" style="margin:0;">${item.name}</div>
//                             ${isBestSeller ? '<span style="background:#fef3c7; color:#92400e; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold; border:1px solid #fcd34d;">⭐ BEST SELLER</span>' : ''}
//                         </div>
//                         <div style="font-size: 0.8rem; color: gray; margin-top: 4px;">${item.category || ''}</div>
//                         <div style="font-weight: 800; margin-top: 4px;">
//                             ${isNotAvailable ? '<span style="color:#94a3b8">NOT AVAILABLE</span>' : '₹' + item.price}
//                         </div>
//                     </div>
//                     <div>
//                         ${isNotAvailable ? 
//                             // This button is disabled and does nothing when clicked
//                             `<button style="background:#cbd5e1; color:white; border:none; padding:10px 16px; border-radius:12px; cursor:not-allowed;">OFF</button>` : 
//                             `<button onclick="addToCart('${item.item_id}', '${safeName}', ${item.price})" style="background:var(--primary); color:white; border:none; padding:10px 18px; border-radius:12px; cursor:pointer; font-weight:bold;">ADD +</button>`
//                         }
//                     </div>
//                 </div>
//             </div>`;
//     });

//     html += `
//         <button onclick="closeMenu()" style="margin-top: 20px; width: 100%; padding: 18px; background: #1e293b; color: white; border-radius: 16px; border: none; font-weight: bold; cursor: pointer;">⬅ Back to Hotels</button>
//         <div style="height:100px;"></div>`;
//     out.innerHTML = html;
// }
function renderMenuItems(hotelName, items) {
    const out = document.getElementById("out");

    // --- THE "WORK AT ANY COST" FIX ---
    // This handles every possible way Google Script might be breaking the data.
    let cleanItems = [];
    if (Array.isArray(items)) {
        cleanItems = items;
    } else if (items && typeof items === 'object' && Array.isArray(items.data)) {
        cleanItems = items.data;
    } else if (items && typeof items === 'object' && Array.isArray(items.items)) {
        cleanItems = items.items;
    }
    // --- END FIX ---

    let html = `<div style="text-align:center; padding: 10px;"><h2 style="color: var(--primary);">${hotelName}</h2></div>`;
    
    // We use cleanItems here to guarantee .forEach works
    cleanItems.forEach(item => {
        const status = (item.status || "").toLowerCase();
        const isSoldOut = status === "sold out";
        const isOff = status === "off" || status === "no"; 
        const isNotAvailable = isSoldOut || isOff;
        const isBestSeller = status === "best seller";

        const safeName = (item.name || "Unnamed Item").replace(/'/g, "\\'");
        
        const rowStyle = isNotAvailable ? "background: #f1f5f9; opacity: 0.6; filter: grayscale(0.8);" : "background: white;";

        html += `
            <div class="restaurant" style="${rowStyle} border-left: 4px solid ${isNotAvailable ? '#cbd5e1' : 'var(--primary)'}; margin-bottom: 12px; padding: 15px; border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; align-items:center;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div class="restaurant-name" style="margin:0;">${item.name || 'Unknown'}</div>
                            ${isBestSeller ? '<span style="background:#fef3c7; color:#92400e; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold; border:1px solid #fcd34d;">⭐ BEST SELLER</span>' : ''}
                        </div>
                        <div style="font-size: 0.8rem; color: gray; margin-top: 4px;">${item.category || ''}</div>
                        <div style="font-weight: 800; margin-top: 4px;">
                            ${isNotAvailable ? '<span style="color:#94a3b8">NOT AVAILABLE</span>' : '₹' + (item.price || '0')}
                        </div>
                    </div>
                    <div>
                        ${isNotAvailable ? 
                            `<button style="background:#cbd5e1; color:white; border:none; padding:10px 16px; border-radius:12px; cursor:not-allowed;">OFF</button>` : 
                            `<button onclick="addToCart('${item.item_id}', '${safeName}', ${item.price})" style="background:var(--primary); color:white; border:none; padding:10px 18px; border-radius:12px; cursor:pointer; font-weight:bold;">ADD +</button>`
                        }
                    </div>
                </div>
            </div>`;
    });

    html += `
        <button onclick="closeMenu()" style="margin-top: 20px; width: 100%; padding: 18px; background: #1e293b; color: white; border-radius: 16px; border: none; font-weight: bold; cursor: pointer;">⬅ Back to Hotels</button>
        <div style="height:100px;"></div>`;
    out.innerHTML = html;
}
// -------------------------------
// 6. HELPERS
// -------------------------------

function closeMenu() {
    const searchCont = document.querySelector('.search-container');
    if(searchCont) searchCont.style.display = 'block';
    loadRestaurants();
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

navigator.geolocation.getCurrentPosition(
    pos => { userLat = pos.coords.latitude; userLng = pos.coords.longitude; loadRestaurants(); },
    () => { loadRestaurants(); },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }

);
//-----------------------------------------------------------------------

function showPaymentForm(orderId, amount, hotelWhatsApp) {
    const out = document.getElementById("out");

    out.innerHTML = `
        <div style="padding:20px; text-align:center;">
            <h2 style="color: var(--primary);">Complete Payment</h2>
            <p>Pay ₹${amount} via UPI</p>

            <input id="utr_input" placeholder="Enter UTR Number"
                style="width:100%; padding:12px; margin-top:15px; border-radius:10px; border:1px solid #ddd;" />

            <input type="file" id="file_input"
                style="margin-top:15px;" />

            <button onclick="submitPaymentProof('${orderId}', '${hotelWhatsApp}')"
                style="margin-top:20px; width:100%; padding:15px; background:#22c55e; color:white; border:none; border-radius:12px; font-weight:bold;">
                Submit Payment ✅
            </button>
        </div>
    `;
}
//---------------------------------------------------------------------
async function submitPaymentProof(orderId, utr, file) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const base64File = reader.result.split(',')[1];
        
        const payload = {
            action: 'uploadPayment', // Action is now INSIDE the body
            order_id: orderId,
            utr: utr,
            file: base64File
        };

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Use no-cors to bypass complex pre-flights for images
                redirect: 'follow', // CRITICAL: Follows the 302 redirect
                body: JSON.stringify(payload)
            });

            // Note: with 'no-cors', you cannot read the JSON response.
            // If you need the response, change to mode: 'cors' and ensure 
            // the backend output function has the headers we discussed.
            
            alert("Payment submitted successfully!");
            window.location.reload(); 

        } catch (error) {
            console.error("Upload error:", error);
            alert("Upload failed. Please check your internet or try again.");
        }
    };
}
