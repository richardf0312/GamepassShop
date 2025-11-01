document.addEventListener("DOMContentLoaded", () => {
    const productsGrid = document.getElementById("products-grid");
    const searchInput = document.getElementById("search-input");
    const cartCount = document.getElementById("cart-count");

    let allProducts = []; // Para guardar los productos y filtrarlos
    let cart = JSON.parse(sessionStorage.getItem("cart")) || [];
    updateCartCount();

    // --- 1. Cargar productos desde la API ---
    async function loadProducts() {
        try {
            const response = await fetch("/api/products");
            if (!response.ok) throw new Error('Error al cargar productos');
            allProducts = await response.json();
            displayProducts(allProducts);
        } catch (error) {
            console.error("Error:", error);
            productsGrid.innerHTML = `<p>Error al cargar productos. Intenta recargar la página.</p>`;
        }
    }

    // --- 2. Mostrar productos en la cuadrícula ---
    function displayProducts(products) {
        productsGrid.innerHTML = ""; // Limpiar
        if (products.length === 0) {
            productsGrid.innerHTML = `<p>No se encontraron productos.</p>`;
            return;
        }

        products.forEach(product => {
            const productCard = document.createElement("div");
            productCard.className = "product-card";
            
            let priceHtml = `<span class="price">$${product.price}</span>`;
            if (product.price_before) {
                priceHtml += ` <span class="price-before">$${product.price_before}</span>`;
            }
            
            let discountPercentage = 0;
            if (product.price_before && product.price) {
                discountPercentage = Math.round(((product.price_before - product.price) / product.price_before) * 100);
            }

            productCard.innerHTML = `
                ${discountPercentage > 0 ? `<div class="discount-badge">-${discountPercentage}%</div>` : ''}
                <div class="product-image">
                    <img src="${product.image_url}" alt="${product.name}">
                </div>
                <div class="product-info">
                    <span class="product-tags">
                        <span class="tag-platform">${product.platform}</span>
                        <span class="tag-duration">${product.duration}</span>
                    </span>
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price">
                        ${priceHtml}
                    </div>
                    <button class="add-to-cart-btn" data-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i> Add To Cart
                    </button>
                </div>
            `;
            productsGrid.appendChild(productCard);
        });
    }

    // --- 3. Filtro de Búsqueda ---
    searchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredProducts = allProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.platform.toLowerCase().includes(searchTerm)
        );
        displayProducts(filteredProducts);
    });

    // --- 4. Añadir al Carrito ---
    productsGrid.addEventListener("click", (e) => {
        if (e.target.classList.contains("add-to-cart-btn") || e.target.closest(".add-to-cart-btn")) {
            const button = e.target.closest(".add-to-cart-btn");
            const id = parseInt(button.dataset.id);
            
            // Buscar el producto en el carrito
            const existingItem = cart.find(item => item.id === id);
            
            if (existingItem) {
                existingItem.quantity++;
            } else {
                const product = allProducts.find(p => p.id === id);
                cart.push({ ...product, quantity: 1 });
            }
            
            sessionStorage.setItem("cart", JSON.stringify(cart));
            updateCartCount();
            
            // Feedback visual
            button.innerHTML = '<i class="fas fa-check"></i> Added!';
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-shopping-cart"></i> Add To Cart';
            }, 1500);
        }
    });

    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.innerText = totalItems;
    }

    // Carga inicial
    loadProducts();
});