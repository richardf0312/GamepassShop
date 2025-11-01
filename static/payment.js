document.addEventListener("DOMContentLoaded", () => {
    // 1. Obtener los datos de pago guardados
    const paymentData = JSON.parse(sessionStorage.getItem("pendingPayment"));
    const qrContainer = document.getElementById("qrcode");
    const copyButton = document.getElementById("copy-button");
    const walletInput = document.getElementById("wallet-address");
    const qrLabel = document.querySelector(".qr-label");

    if (paymentData) {
        // 2. Rellenar los campos en el HTML
        document.getElementById("order-id").innerText = paymentData.orderId;
        document.getElementById("exact-amount").innerText = paymentData.exactAmount;
        document.getElementById("currency-ticker").innerText = paymentData.currency;
        document.getElementById("wallet-address").value = paymentData.paymentAddress;

        // 3. Generar el QR Code (o esconderlo si es MXN)
        qrContainer.innerHTML = "";
        
        if(paymentData.currency === "MXN") {
            // No mostrar QR para transferencia bancaria
            qrContainer.style.display = "none";
            qrLabel.style.display = "none";
        } else {
            // Generar QR para Cripto
            new QRCode(qrContainer, {
                text: paymentData.paymentAddress,
                width: 160,
                height: 160,
                colorDark: "#ffffff",
                colorLight: "#2c2c2c"
            });
        }

    } else {
        document.body.innerHTML = "<h1>Error: No se encontró la orden.</h1>";
    }

    // 4. Lógica del botón de copiar
    copyButton.addEventListener("click", () => {
        walletInput.select();
        walletInput.setSelectionRange(0, 99999);
        try {
            navigator.clipboard.writeText(walletInput.value);
            copyButton.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => { copyButton.innerHTML = '<i class="fas fa-copy"></i>'; }, 2000);
        } catch (err) {
            console.error('Error al copiar: ', err);
        }
    });
});