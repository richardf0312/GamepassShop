document.addEventListener("DOMContentLoaded", () => {
    // Formularios
    const addForm = document.getElementById("add-product-form");
    const editForm = document.getElementById("edit-product-form");

    // Botones
    const showAddFormBtn = document.getElementById("show-add-form-btn");
    const cancelAddBtn = document.getElementById("cancel-add-btn");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");

    // Contenedores de listas
    const productsList = document.getElementById("products-list");
    const ordersList = document.getElementById("orders-list");
    
    // Modal
    const editModal = document.getElementById("edit-modal");

    // Contenedores de Estadísticas
    const statProducts = document.getElementById("stat-products");
    const statOrders = document.getElementById("stat-orders");
    const statRevenue = document.getElementById("stat-revenue");

    const api = {
        getStats: () => fetch("/api/stats").then(res => res.json()),
        getProducts: () => fetch("/api/products").then(res => res.json()),
        getOrders: () => fetch("/api/orders").then(res => res.json()),
        addProduct: (product) => fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(product),
        }),
        updateProduct: (id, product) => fetch(`/api/products/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(product),
        }),
        deleteProduct: (id) => fetch(`/api/products/${id}`, { method: "DELETE" }),
        cancelOrder: (id) => fetch(`/api/orders/${id}/cancel`, { method: "PUT" }),
    };

    // --- Cargar Estadísticas ---
    async function loadStats() {
        try {
            const stats = await api.getStats();
            statProducts.innerText = stats.total_products;
            statOrders.innerText = stats.total_orders;
            statRevenue.innerText = `$${stats.total_revenue.toFixed(2)}`;
        } catch (error) {
            console.error("Error loading stats:", error);
        }
    }

    // --- Cargar Productos ---
    async function loadProducts() {
        try {
            const products = await api.getProducts();
            productsList.innerHTML = "";
            products.forEach(product => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>
                        <img src="${product.image_url}" alt="${product.name}" class="table-product-image">
                        ${product.name}
                    </td>
                    <td>${product.platform}</td>
                    <td>${product.duration}</td>
                    <td>$${product.price}</td>
                    <td>${product.stock}</td>
                    <td class="table-actions">
                        <button class="icon-btn edit-btn" data-id="${product.id}"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn delete-btn" data-id="${product.id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                productsList.appendChild(tr);
            });
        } catch (error) {
            console.error("Error loading products:", error);
        }
    }

    // --- Cargar Órdenes ---
    async function loadOrders() {
        try {
            const orders = await api.getOrders();
            ordersList.innerHTML = "";
            if (orders.length === 0) {
                ordersList.innerHTML = `<tr><td colspan="7">No recent orders found.</td></tr>`;
                return;
            }
            orders.forEach(order => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${order.order_id_str}</td>
                    <td>${order.customer_email}</td>
                    <td>${order.items_count}</td>
                    <td>$${order.total.toFixed(2)}</td>
                    <td><span class="payment-tag">${order.payment_method}</span></td>
                    <td><span class="status-tag status-${order.status}">${order.status}</span></td>
                    <td class="table-actions">
                        ${order.status === 'pending' ? `<button class="button-secondary cancel-order-btn" data-id="${order.id}">Cancel Order</button>` : 'No actions'}
                    </td>
                `;
                ordersList.appendChild(tr);
            });
        } catch (error) {
            console.error("Error loading orders:", error);
        }
    }

    // --- Cargar todo al inicio ---
    function loadAll() {
        loadStats();
        loadProducts();
        loadOrders();
    }

    // --- Manejo de Formularios y Modal ---
    showAddFormBtn.addEventListener("click", () => {
        addForm.classList.remove("hidden");
        showAddFormBtn.classList.add("hidden");
    });

    cancelAddBtn.addEventListener("click", () => {
        addForm.classList.add("hidden");
        showAddFormBtn.classList.remove("hidden");
        addForm.reset();
    });

    cancelEditBtn.addEventListener("click", () => {
        editModal.classList.add("hidden");
    });

    // --- Event Listener: Añadir Producto ---
    addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const priceVal = document.getElementById("add-price").value.replace(',', '.');
        const priceBeforeVal = document.getElementById("add-price_before").value.replace(',', '.');
        const stockVal = document.getElementById("add-stock").value;

        const product = {
            name: document.getElementById("add-name").value,
            platform: document.getElementById("add-platform").value,
            duration: document.getElementById("add-duration").value,
            image_url: document.getElementById("add-image_url").value,
            price: priceVal ? parseFloat(priceVal) : 0,
            price_before: priceBeforeVal ? parseFloat(priceBeforeVal) : null,
            stock: stockVal ? parseInt(stockVal) : 0,
        };

        try {
            const response = await api.addProduct(product);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to add product');
            }
            addForm.reset();
            cancelAddBtn.click(); // Ocultar formulario
            loadAll(); // Recargar todo
        } catch (error) {
            console.error("Error:", error);
            alert("Error adding product: " + error.message);
        }
    });

    // --- Event Listener: Abrir Modal de Edición ---
    productsList.addEventListener("click", async (e) => {
        const editBtn = e.target.closest(".edit-btn");
        if (editBtn) {
            const id = editBtn.dataset.id;
            // Obtener datos del producto (idealmente de una caché, pero por simplicidad volvemos a buscar)
            const products = await api.getProducts();
            const product = products.find(p => p.id == id);
            
            if (product) {
                // Llenar el formulario del modal
                document.getElementById("edit-id").value = product.id;
                document.getElementById("edit-name").value = product.name;
                document.getElementById("edit-platform").value = product.platform;
                document.getElementById("edit-duration").value = product.duration;
                document.getElementById("edit-price").value = product.price;
                document.getElementById("edit-price_before").value = product.price_before || '';
                document.getElementById("edit-stock").value = product.stock;
                document.getElementById("edit-image_url").value = product.image_url;
                
                // Mostrar el modal
                editModal.classList.remove("hidden");
            }
        }
    });

    // --- Event Listener: Enviar Formulario de Edición ---
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const id = document.getElementById("edit-id").value;
        const priceVal = document.getElementById("edit-price").value.replace(',', '.');
        const priceBeforeVal = document.getElementById("edit-price_before").value.replace(',', '.');
        
        const product = {
            name: document.getElementById("edit-name").value,
            platform: document.getElementById("edit-platform").value,
            duration: document.getElementById("edit-duration").value,
            image_url: document.getElementById("edit-image_url").value,
            price: priceVal ? parseFloat(priceVal) : 0,
            price_before: priceBeforeVal ? parseFloat(priceBeforeVal) : null,
            stock: parseInt(document.getElementById("edit-stock").value) || 0,
        };

        try {
            const response = await api.updateProduct(id, product);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to update product');
            }
            editModal.classList.add("hidden"); // Ocultar modal
            loadAll(); // Recargar todo
        } catch (error) {
            console.error("Error:", error);
            alert("Error updating product: " + error.message);
        }
    });

    // --- Event Listener: Borrar Producto ---
    productsList.addEventListener("click", async (e) => {
        const deleteBtn = e.target.closest(".delete-btn");
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm("Are you sure you want to delete this product? This cannot be undone.")) {
                try {
                    await api.deleteProduct(id);
                    loadAll(); // Recargar todo
                } catch (error) {
                    console.error("Error:", error);
                    alert("Error deleting product.");
                }
            }
        }
    });

    // --- Event Listener: Cancelar Orden ---
    ordersList.addEventListener("click", async (e) => {
        const cancelBtn = e.target.closest(".cancel-order-btn");
        if (cancelBtn) {
            const id = cancelBtn.dataset.id;
            if (confirm("Are you sure you want to cancel this order?")) {
                try {
                    await api.cancelOrder(id);
                    loadAll(); // Recargar todo
                } catch (error) {
                    console.error("Error:", error);
                    alert("Error cancelling order.");
                }
            }
        }
    });

    // Carga inicial de datos
    loadAll();
});