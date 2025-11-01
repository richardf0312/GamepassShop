document.addEventListener("DOMContentLoaded", () => {
    const cartItemsList = document.getElementById("cart-items-list");
    const subtotalEl = document.getElementById("summary-subtotal");
    const totalEl = document.getElementById("summary-total");
    const checkoutForm = document.getElementById("checkout-form");
    const proceedBtn = document.getElementById("proceed-btn");

    let cart = JSON.parse(sessionStorage.getItem("cart")) || [];

    // --- 1. Cargar items del carrito ---
    function loadCartItems() {
        cartItemsList.innerHTML = "";
        let subtotal = 0;

        if (cart.length === 0) {
            cartItemsList.innerHTML = "<p>Your cart is empty.</p>";
            proceedBtn.disabled = true;
        }

        cart.forEach(item => {
            const itemElement = document.createElement("div");
            itemElement.className = "cart-item";
            itemElement.innerHTML = `
                <img src="${item.image_url}" alt="${item.name}">
                <div class="item-info">
                    <p>${item.name}</p>
                    <span class="item-price">$${item.price} x ${item.quantity}</span>
                </div>
                <div class="item-total">$${(item.price * item.quantity).toFixed(2)}</div>
                <button class="remove-item-btn" data-id="${item.id}">&times;</button>
            `;
            cartItemsList.appendChild(itemElement);
            subtotal += item.price * item.quantity;
        });

        subtotalEl.innerText = `$${subtotal.toFixed(2)}`;
        totalEl.innerText = `$${subtotal.toFixed(2)}`;
    }

    // --- 2. Eliminar item del carrito ---
    cartItemsList.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-item-btn")) {
            const id = parseInt(e.target.dataset.id);
            cart = cart.filter(item => item.id !== id);
            sessionStorage.setItem("cart", JSON.stringify(cart));
            loadCartItems();
        }
    });

    // --- 3. Procesar el pago ---
    checkoutForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        proceedBtn.innerText = "Processing...";
        proceedBtn.disabled = true;

        const email = document.getElementById("email").value;
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        
        // Preparamos los datos para la API
        const orderData = {
            email: email,
            paymentMethod: paymentMethod,
            cart: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price }))
        };

        try {
            // Llamar a nuestra API de backend
            const response = await fetch("/api/create-invoice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderData),
            });
            
            if (!response.ok) throw new Error("Error al crear la factura");

            const invoiceData = await response.json();
            
            // Guardar los datos de la factura para la siguiente página
            sessionStorage.setItem("pendingPayment", JSON.stringify(invoiceData));
            
            // Limpiar carrito
            sessionStorage.removeItem("cart");
            
            // Redirigir a la página de pago
            window.location.href = "/payment";

        } catch (error) {
            console.error("Error:", error);
            alert("Hubo un error al procesar tu orden. Por favor, intenta de nuevo.");
            proceedBtn.innerText = "Proceed to Payment";
            proceedBtn.disabled = false;
        }
    });

    // Carga inicial
    loadCartItems();
});