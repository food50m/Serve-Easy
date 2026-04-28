/* FOOD 50m - Main Application Logic
  Version: 1.1.1 (Official Launch)
  Description: Handles geolocation, restaurant listing, menu fetching, and order placement.
*/


const API = "https://script.google.com/macros/s/AKfycbyHlQGZlxDZSa1O-UHIc9Ui97BZ2HyUzK81JNwzsPaV_FmIxNcS3k3Vn3CVgD8IGxPd/exec";

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
            position: fixed; 
            bottom: 20px; left: 50%; transform: translateX(-50%);
            width: 90%; max-width: 500px; background: #1e293b; color: white;
            padding: 15px 20px; border-radius: 20px; display: flex;
            justify-content: space-between; align-items: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 9999;
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

// function checkout() {
//     const out = document.getElementById("out");
//     const oldName = document.getElementById("cust_name")?.value || localStorage.getItem("user_name") || "";
//     const oldPhone = document.getElementById("cust_phone")?.value || localStorage.getItem("user_phone") || "";
//     const oldNote = document.getElementById("cust_note")?.value || "";

//     if (document.getElementById("cart-bar")) document.getElementById("cart-bar").style.display = 'none';

//     let total = cart.reduce((sum, item) => sum + (item.qty * item.price), 0);
 
//     let html = `
//         <div style="padding: 10px;">
//             <h2 style="color: var(--primary); text-align: center;">Finalize Order</h2>
//             <div style="background: white; border-radius: 15px; padding: 15px; box-shadow: var(--shadow); margin-bottom: 15px;">
//                 <p style="font-weight:bold; color:var(--text-light); margin-top:0; margin-bottom:10px;">Contact Details</p>
//                 <input id="cust_name" type="text" placeholder="Your Name" value="${oldName}" style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #eee; border-radius:10px; box-sizing:border-box;">
//                 <input id="cust_phone" type="tel" placeholder="Mobile Number" value="${oldPhone}" style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #eee; border-radius:10px; box-sizing:border-box;">
//                 <textarea id="cust_note" placeholder="Special Instructions (Optional)" style="width:100%; padding:12px; border:1px solid #eee; border-radius:10px; box-sizing:border-box; height: 60px; font-family: inherit; margin-bottom:10px;">${oldNote}</textarea>
//                 <p style="font-weight:bold; color:var(--text-light); margin-bottom:8px;">Select Payment Mode:</p>
//                 <select id="pay_mode" style="width:100%; padding:12px; border:1px solid #eee; border-radius:10px; background:#f8fafc; font-weight:600; cursor:pointer;">
//                         <option value="Online">📲 Online (GPay/PhonePe)</option>
//                 </select>
//             </div>
//             <div style="background: white; border-radius: 15px; padding: 15px; box-shadow: var(--shadow);">
//                 <p style="font-weight:bold; color:var(--text-light); margin-top:0;">Order Summary</p>
//     `;

// // Replace the block where you define payment mode and the summary with this:
//     cart.forEach((item, index) => {
//         html += `
//             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #fafafa; padding-bottom: 8px;">
//                 <div style="flex: 1;">
//                     <div style="font-weight:600;">${item.name}</div>
//                     <div style="font-size: 0.9rem; color: var(--primary);">₹${item.price}</div>
//                 </div>
//                 <div style="display: flex; align-items: center; gap: 10px;">
//                     <button onclick="changeQty(${index}, -1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #ddd; background:white;">-</button>
//                     <span style="font-weight:bold;">${item.qty}</span>
//                     <button onclick="changeQty(${index}, 1)" style="width:28px; height:28px; border-radius:50%; border:1px solid #ddd; background:white;">+</button>
//                 </div>
//             </div>`;
//     });

//     html += `
//                 <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 1.2rem; font-weight: 900; color: var(--primary);">
//                     <span>Total:</span><span>₹${total}</span>
//                 </div>
//             </div>
//             <button id="finalOrderBtn" onclick="placeFinalOrder()" style="margin-top: 25px; width: 100%; padding: 18px; background: #22c55e; color: white; border: none; border-radius: 16px; font-weight: 800; font-size: 1.1rem; cursor: pointer;">
//                 Confirm Order ✅
//             </button>
//             <button onclick="viewCart()" style="margin-top: 15px; width: 100%; background:none; border:none; color:gray; cursor:pointer; font-weight:600;">⬅ Edit Items</button>
//         </div>`;
//     out.innerHTML = html;
// }
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

                <div id="upload-section" style="margin-top: 15px; padding: 12px; border: 2px dashed #22c55e; border-radius: 10px; background: #f0fdf4;">
                    <p style="font-size: 0.85rem; font-weight:bold; color: #166534; margin-bottom: 5px;">📸 Upload Payment Screenshot:</p>
                    <input type="file" id="screenshotInput" accept="image/*" style="width: 100%; font-size: 0.8rem;">
                </div>
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
//---------------------------------------------------------------------------
function changeQty(index, amount) {
    cart[index].qty += amount;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    if (cart.length === 0) viewCart(); else checkout();
}

// -------------------------------
// 3. FINAL ORDER & WHATSAPP
// -------------------------------

//  function placeFinalOrder() {
//     const name = document.getElementById("cust_name").value;
//     const phone = document.getElementById("cust_phone").value;
//     const note = document.getElementById("cust_note").value;
//     const payMode = document.getElementById("pay_mode").value;

//     if (!name || !phone) { alert("Please enter name and phone!"); return; }

//     const btn = document.getElementById("finalOrderBtn");
//     if(btn) { btn.disabled = true; btn.innerText = "Processing..."; }

//     localStorage.setItem("user_name", name);
//     localStorage.setItem("user_phone", phone);

//     const out = document.getElementById("out");
//     const selectedRestaurantId = sessionStorage.getItem("current_res_id");
//     const hotelWhatsApp = sessionStorage.getItem("current_res_wa") || "910000000000";
//     const itemsString = cart.map(item => `${item.qty}x ${item.name}`).join(", ");
//     const totalAmount = cart.reduce((sum, item) => sum + (item.qty * item.price), 0);

//     out.innerHTML = `<div style="text-align:center; padding:50px;"><p>Sending your order... 🚀</p></div>`;

//     fetch(API + "?action=createOrder", {
//         method: "POST",
//         body: JSON.stringify({
//             restaurant_id: selectedRestaurantId,
//             items: itemsString,
//             total: totalAmount,
//             customer_name: name,
//             customer_phone: phone,
//             payment_mode: payMode,  
//             notes: note  
//         })
//     })
//     .then(r => r.json())
//     .then(res => {
//         if (res.success) {
//             // 🟢 PASS NAME AND PHONE HERE
//             showPaymentForm(res.order_id, totalAmount, hotelWhatsApp, name, phone, itemsString);
//             cart = []; 
//         } else { 
//             alert("Error placing order: " + (res.error || "Unknown error")); 
//             checkout(); 
//         }
//     })
//     .catch(err => { 
//         console.error("Order Fetch Error:", err); 
//         alert("Server connection failed. Please try again.");
//         checkout(); 
//     });
// }
async function placeFinalOrder() {
    const name = document.getElementById("cust_name").value;
    const phone = document.getElementById("cust_phone").value;
    const note = document.getElementById("cust_note").value;
    const payMode = document.getElementById("pay_mode").value;
    const fileInput = document.getElementById("screenshotInput");

    if (!name || !phone) { alert("Please enter name and phone!"); return; }

    if (payMode === "Online" && (!fileInput.files || !fileInput.files[0])) {
        alert("Please upload your payment screenshot first!");
        return;
    }

    const btn = document.getElementById("finalOrderBtn");
    if(btn) { btn.disabled = true; btn.innerText = "Uploading Proof..."; }

    // 🟢 Convert and Compress file to Base64
    let base64File = "";
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        base64File = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800; // Resize to max 800px width
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    // Export as JPEG with 0.7 quality to save space
                    resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
                };
            };
        });
    }

    const selectedRestaurantId = sessionStorage.getItem("current_res_id");
    const hotelWhatsApp = sessionStorage.getItem("current_res_wa") || "910000000000";
    const itemsString = cart.map(item => `${item.qty}x ${item.name}`).join(", ");
    const totalAmount = cart.reduce((sum, item) => sum + (item.qty * item.price), 0);

    const out = document.getElementById("out");
    out.innerHTML = `<div style="text-align:center; padding:50px;"><p>Sending your order... 🚀</p></div>`;

    fetch(API + "?action=createOrder", {
        method: "POST",
        body: JSON.stringify({
            restaurant_id: selectedRestaurantId,
            items: itemsString,
            total: totalAmount,
            customer_name: name,
            customer_phone: phone,
            payment_mode: payMode,  
            notes: note,
            file: base64File
        })
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            localStorage.setItem("user_name", name);
            localStorage.setItem("user_phone", phone);
            
            const msg = `*NEW ORDER:* ${res.order_id}\n*Customer:* ${name}\n*Mobile:* ${phone}\n*Items:* ${itemsString}\n*Total:* ₹${totalAmount}\n*Status:* Payment Screenshot Uploaded`;
            window.location.href = `https://wa.me/${hotelWhatsApp}?text=${encodeURIComponent(msg)}`;
            cart = []; 
        } else { 
            alert("Error: " + res.error);
            checkout(); 
        }
    })
    .catch(err => {
        console.error(err);
        alert("Server connection failed.");
        checkout();
    });
}
// ----------------------------------------------------------------------------------------------
// 4. GEOLOCATION & LISTING
// -----------------------------------------------------------------------------------------------

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
//--------------------------------------------
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
//---------------------------------------------------------------------------------------------------------------
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
//-------------------------------------------------------------------------------------------------------
function renderMenuItems(hotelName, items) {
    const out = document.getElementById("out");
const hotelWA = sessionStorage.getItem("current_res_wa") || "Contact Support";
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

    let html = `<div style="text-align:center; padding: 10px;"><h2 style="color: var(--primary);">${hotelName}</h2>
     <p style="font-weight: bold; color: #475569; margin-top: 0; margin-bottom: 5px;">
                pay on this number: <span style="color: #22c55e;">${hotelWA}</span>
            </p>
            <p style="font-size: 0.85rem; color: #64748b; margin-top: 0;">
                (Kindly upload the screenshot after payment on next screen)
            </p></div>`;
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
        <div style="height:120px;"></div>`;
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
//------------------------------------------------------------------------------------------------
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
// function showPaymentForm(orderId, amount, hotelWhatsApp) {
//     // 1. Capture the values while the inputs still exist
//     const name = document.getElementById("customerName").value;
//     const phone = document.getElementById("customerPhone").value;
    
//     // 2. Prepare the items list as a clean string
//     const itemsSummary = cart.map(i => `${i.qty}x ${i.name}`).join(", ");

//     const out = document.getElementById("out");

//     // 3. Inject the Payment UI
//     out.innerHTML = `
//         <div style="padding:20px; text-align:center;">
//             <h2 style="color: var(--primary);">Complete Payment</h2>
//             <p style="font-weight:bold; font-size:1.2rem;">Amount: ₹${amount}</p>
//             <p style="color:gray; font-size:0.9rem;">Upload screenshot for Order: ${orderId}</p>

//             <div style="margin-top:20px; border:2px dashed #ddd; padding:20px; border-radius:15px; background:#f9fafb;">
//                 <input type="file" id="screenshotInput" accept="image/*" style="width:100%;">
//             </div>

//             <button id="submitPayBtn" 
//                 style="margin-top:25px; width:100%; padding:18px; background:#22c55e; color:white; border:none; border-radius:12px; font-weight:bold; font-size:1.1rem; cursor:pointer;">
//                 Submit Payment ✅
//             </button>
//         </div>
//     `;

//     // 4. Use an Event Listener instead of 'onclick' in HTML string 
//     // This avoids quote errors with the itemsSummary
//     document.getElementById("submitPayBtn").addEventListener("click", () => {
//         handlePaymentSubmission(orderId, hotelWhatsApp, name, phone, amount, itemsSummary);
//     });
// }
// Now this function receives name and phone as arguments!
function showPaymentForm(orderId, amount, hotelWhatsApp, name, phone, itemsSummary) {
    const out = document.getElementById("out");

    out.innerHTML = `
        <div style="padding:20px; text-align:center;">
            <h2 style="color: #22c55e;">Order Placed! ✅</h2>
            <p style="margin-bottom:10px;">Order ID: <b>${orderId}</b></p>
            <p style="font-size:1.2rem; font-weight:bold;">Total to Pay: ₹${amount}</p>
            
            <div style="margin:20px 0; border:2px dashed #ccc; padding:20px; border-radius:10px; background:#f9f9f9;">
                <p style="font-size:0.9rem; color:#666;">Upload Payment Screenshot</p>
                <input type="file" id="screenshotInput" accept="image/*" style="width:100%; margin-top:10px;">
            </div>

            <button id="submitPayBtn" 
                style="width:100%; padding:15px; background:#16a34a; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">
                Submit Payment & Notify WhatsApp
            </button>
        </div>
    `;

    document.getElementById("submitPayBtn").onclick = () => {
        // 🟢 Pass all the data forward to handle the final WhatsApp message
        handlePaymentSubmission(orderId, hotelWhatsApp, name, phone, amount, itemsSummary);
    };
}
//---------------------------------------------------------------------
// Add 'receiptMsg' as the 4th argument
async function submitPaymentProof(orderId, file, hotelWhatsApp, receiptMsg) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = async () => {
            // ... (KEEP YOUR EXISTING COMPRESSION CODE) ...
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; 
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

            const payload = {
                action: 'uploadPayment',
                order_id: orderId,
                utr: "IMAGE_UPLOADED",
                file: compressedBase64
            };

            try {
                await fetch(API + "?action=uploadPayment", {
                    method: 'POST',
                    mode: 'no-cors',
                    body: JSON.stringify(payload)
                });

                // 🟢 SUCCESS: USE THE DETAILED RECEIPT MESSAGE HERE
                alert("Upload Successful! Opening WhatsApp for final confirmation.");
                
                // We use the 'receiptMsg' passed from the handle function
                window.location.href = `https://wa.me/${hotelWhatsApp}?text=${encodeURIComponent(receiptMsg)}`;

            } catch (e) {
                console.error(e);
                alert("Error during upload. Please notify the restaurant.");
            }
        };
    };
}
//--------------------------------------------------------------------------------------------------------------------------------------------------------

  async function handlePaymentSubmission(orderId, hotelWhatsApp, name, phone, amount, items) {
    const fileInput = document.getElementById('screenshotInput');
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select your payment screenshot!");
        return;
    }

    const btn = document.getElementById("submitPayBtn");
    btn.disabled = true;
    btn.innerText = "Uploading... Please Wait";

    // Build the WhatsApp receipt
    const receiptMsg = `*NEW ORDER RECEIVED*
--------------------------
*Order ID:* ${orderId}
*Customer:* ${name}
*Mobile:* ${phone}
*Items:* ${items}
*Total:* ₹${amount}
*Payment:* Online (Screenshot Uploaded)
--------------------------
💵 *Instruction:* Please verify screenshot in your Restaurant Panel.`;

    // Send to your existing submitPaymentProof function
    submitPaymentProof(orderId, file, hotelWhatsApp, receiptMsg);
}
