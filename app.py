import os
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func # Para contar y sumar

# --- Configuración Inicial ---
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__,
            template_folder='templates',
            static_folder='static')
# === CONEXIÓN A LA BASE DE DATOS (PRODUCCIÓN Y LOCAL) ===
# Busca la URL de la base de datos de Render
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    # Si la encuentra (estamos en Render), la usa

    # Corrección para SQLAlchemy (Render usa "postgresql://", SQLAlchemy prefiere "postgres://")
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgres://", 1)

    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
else:
    # Si no la encuentra (estamos en local), usa el archivo sqlite
    print("DATABASE_URL no encontrada. Usando 'products.db' local.")
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'products.db')
# === FIN DE LA CONEXIÓN ===
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Modelos de la Base de Datos ---

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    platform = db.Column(db.String(50), nullable=False)
    duration = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    price_before = db.Column(db.Float, nullable=True)
    stock = db.Column(db.Integer, default=100)
    image_url = db.Column(db.String(200), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'platform': self.platform,
            'duration': self.duration,
            'price': self.price,
            'price_before': self.price_before,
            'stock': self.stock,
            'image_url': self.image_url
        }

# NUEVO: Modelo para las Órdenes
class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id_str = db.Column(db.String(50), unique=True, nullable=False) # ej. GPCTC67830
    customer_email = db.Column(db.String(100), nullable=False)
    items_count = db.Column(db.Integer, nullable=False)
    total = db.Column(db.Float, nullable=False)
    payment_method = db.Column(db.String(10), nullable=False) # ej. 'BTC', 'LTC'
    status = db.Column(db.String(20), nullable=False, default='pending') # pending, completed, failed, cancelled
    timestamp = db.Column(db.DateTime, server_default=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'order_id_str': self.order_id_str,
            'customer_email': self.customer_email,
            'items_count': self.items_count,
            'total': self.total,
            'payment_method': self.payment_method,
            'status': self.status,
            'timestamp': self.timestamp.isoformat()
        }


# --- Rutas del Frontend (Las Páginas HTML) ---

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/adminpanelconfig')
def admin_panel():
    return render_template('admin.html')

@app.route('/checkout')
def checkout_page():
    return render_template('checkout.html')

@app.route('/payment')
def payment_page():
    return render_template('payment.html')

# --- API (Comunicación con el Backend) ---

# --- API de Productos (Añadir, Borrar, Editar, Ver) ---

@app.route('/api/products', methods=['GET'])
def get_products():
    """ API para OBTENER todos los productos """
    products = Product.query.order_by(Product.id.desc()).all()
    return jsonify([p.to_dict() for p in products])

@app.route('/api/products', methods=['POST'])
def add_product():
    """ API para AÑADIR un nuevo producto """
    data = request.json
    try:
        if not data.get('name') or not data.get('platform') or data.get('price') is None or data.get('stock') is None or not data.get('image_url'):
             return jsonify({'error': 'Faltan datos obligatorios'}), 400

        new_product = Product(
            name=data['name'],
            platform=data['platform'],
            duration=data['duration'],
            price=float(data['price']),
            price_before=float(data['price_before']) if data.get('price_before') else None,
            stock=int(data['stock']),
            image_url=data['image_url']
        )
        db.session.add(new_product)
        db.session.commit()
        return jsonify(new_product.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error al añadir producto: {e}")
        return jsonify({'error': f'Error interno: {e}'}), 500

@app.route('/api/products/<int:id>', methods=['PUT'])
def update_product(id):
    """ NUEVO: API para EDITAR (actualizar) un producto """
    product = Product.query.get_or_404(id)
    data = request.json
    try:
        product.name = data.get('name', product.name)
        product.platform = data.get('platform', product.platform)
        product.duration = data.get('duration', product.duration)
        product.price = float(data.get('price', product.price))
        product.price_before = float(data['price_before']) if data.get('price_before') else None
        product.stock = int(data.get('stock', product.stock))
        product.image_url = data.get('image_url', product.image_url)
        
        db.session.commit()
        return jsonify(product.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error al actualizar producto: {e}")
        return jsonify({'error': f'Error interno: {e}'}), 500

@app.route('/api/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    """ API para BORRAR un producto """
    product = Product.query.get_or_404(id)
    db.session.delete(product)
    db.session.commit()
    return jsonify({'message': 'Producto eliminado'}), 200

# --- API de Órdenes (Crear, Ver, Cancelar) ---

@app.route('/api/orders', methods=['GET'])
def get_orders():
    """ NUEVO: API para OBTENER las últimas órdenes """
    # Obtenemos las 20 más recientes
    orders = Order.query.order_by(Order.timestamp.desc()).limit(20).all()
    return jsonify([o.to_dict() for o in orders])

@app.route('/api/orders/<int:id>/cancel', methods=['PUT'])
def cancel_order(id):
    """ NUEVO: API para CANCELAR una orden """
    order = Order.query.get_or_404(id)
    try:
        order.status = 'cancelled'
        db.session.commit()
        return jsonify(order.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error interno: {e}'}), 500

# ===================================================================
# === INICIO: FUNCIÓN create_invoice MODIFICADA ===
# ===================================================================
@app.route('/api/create-invoice', methods=['POST'])
def create_invoice():
    """
    MODIFICADO: Ahora guarda la orden en la BD y calcula tasas dinámicamente.
    """
    data = request.json
    email = data.get('email')
    payment_method = data.get('paymentMethod')
    cart_items = data.get('cart', [])

    # Calcular total e items
    total_price = sum(item.get('price', 0) * item.get('quantity', 1) for item in cart_items)
    total_items = sum(item.get('quantity', 1) for item in cart_items)

    # ==========================================================
    # === 1. TASAS DE CAMBIO (BASADAS EN TUS FOTOS) ===
    # (Cuánto cuesta 1 unidad de cripto en USD/USDT)
    # ==========================================================
    try:
        # Aquí puedes cambiar los precios manualmente cuando quieras
        tasa_btc_usd = 110222.77  # De imagen: 1 BTC = 110,222.77 USDT
        tasa_ltc_usd = 97.33      # De imagen: 1 LTC = 97.33 USDT
        tasa_eth_usd = 3866.14    # De imagen: 1 ETH = 3,866.14 USDT
        tasa_usdt_usd = 1.00      # 1 USDT = 1 USD
        
        # (Cuántos MXN son 1 USD)
        tasa_mxn_usd = 18.56      # De imagen: 1 USD = 18.56 MXN
    
    except Exception as e:
        print(f"Error en tasas de cambio: {e}")
        return jsonify({'error': 'Error al procesar tasas de cambio'}), 500
    # ==========================================================

    # Generar ID de orden
    order_id_string = f"GP{abs(hash(email + str(func.now()))) % 1000000}"
    
    payment_address = ""
    exact_amount = ""

    # ==========================================================
    # === 2. LÓGICA DE CÁLCULO Y WALLETS (DE TU app.py) ===
    # ==========================================================
    if payment_method == "btc":
        payment_address = "bc1qq79v88rlwmmj2rg789yyx885y9qdudgzeeu7fj" # Tu wallet
        crypto_amount = total_price / tasa_btc_usd
        exact_amount = f"{crypto_amount:.8f}" # 8 decimales
 
    elif payment_method == "ltc":
        payment_address = "LTi9b1qPEFeAxN8prrtQyQ6QprH9QmUCuA" # Tu wallet
        crypto_amount = total_price / tasa_ltc_usd
        exact_amount = f"{crypto_amount:.8f}" # 8 decimales
    
    elif payment_method == "eth":
        payment_address = "0x37dc3bBce25A9328B560E75c4C5CB020d647b64A" # Tu wallet
        crypto_amount = total_price / tasa_eth_usd
        exact_amount = f"{crypto_amount:.8f}" # 8 decimales
    
    elif payment_method == "usdt":
        payment_address = "0x37dc3bBce25A9328B560E75c4C5CB020d647b64A" # Tu wallet (USDT ERC20)
        crypto_amount = total_price / tasa_usdt_usd
        exact_amount = f"{crypto_amount:.2f}" # 2 decimales
    
    elif payment_method == "transferencia_mx":
        payment_address = "CLABE: 058597000077868264 HEYBANCO ROMAN" # Tu CLABE
        mxn_amount = total_price * tasa_mxn_usd
        exact_amount = f"{mxn_amount:.2f}" # 2 decimales
    # ==========================================================
    
    # GUARDAR LA ORDEN EN LA BASE DE DATOS
    try:
        new_order = Order(
            order_id_str=order_id_string,
            customer_email=email,
            items_count=total_items,
            total=total_price,
            payment_method=payment_method.upper(),
            status='pending' # La orden nace como pendiente
        )
        db.session.add(new_order)
        db.session.commit()

        # Respuesta al frontend
        response_data = {
            "orderId": order_id_string,
            "paymentAddress": payment_address,
            "exactAmount": exact_amount,
            "currency": payment_method.upper(),
            "totalUSD": f"{total_price:.2f}"
        }
        return jsonify(response_data), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error al crear factura/guardar orden: {e}")
        return jsonify({'error': f'Error al guardar la orden: {e}'}), 500
# ===================================================================
# === FIN: FUNCIÓN create_invoice MODIFICADA ===
# ===================================================================


# --- API de Estadísticas ---

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """ NUEVO: API para las tarjetas de estadísticas """
    try:
        total_products = db.session.query(func.count(Product.id)).scalar()
        total_orders = db.session.query(func.count(Order.id)).scalar()
        
        # Suma el 'total' solo de órdenes 'completed'
        total_revenue = db.session.query(func.sum(Order.total)).filter(Order.status == 'completed').scalar()

        return jsonify({
            'total_products': total_products or 0,
            'total_orders': total_orders or 0,
            'total_revenue': total_revenue or 0.00
        }), 200
    except Exception as e:
        print(f"Error al get stats: {e}")
        return jsonify({'error': f'Error interno: {e}'}), 500


# --- Ejecutar la App ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all() # Crea las tablas 'Product' y 'Order' si no existen
    app.run(debug=True, port=5000)
