const http = require('http');
const querystring = require('querystring');

// ====== CONFIGURACIÓN ======
const PHONE_ID = "715063425004109";
const ACCESS_TOKEN = "103735442216971|2bh7vGc6IsVRiLNPLJpCqgPB8iw4";
const OWNER_WHATSAPP = "+59176524354";
const VERIFY_TOKEN = "wattup_webhook_2026"; // Cambia esto a algo seguro

// ====== MAPEO DE PRODUCTOS ======
const PRODUCTOS = {
  "emberton_ii": {
    nombre: "Emberton II",
    emoji: "🎵",
    precio: "Consultar"
  },
  "middleton": {
    nombre: "Middleton",
    emoji: "🎶",
    precio: "Consultar"
  },
  "emberton_iii": {
    nombre: "Emberton III",
    emoji: "🎼",
    precio: "Consultar"
  }
};

// ====== FUNCIÓN: Enviar mensaje WhatsApp ======
async function enviarMensajeWhatsApp(numero, mensaje) {
  try {
    const url = `https://graph.instagram.com/v18.0/${PHONE_ID}/messages`;
    
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: numero.replace("+", ""),
      type: "text",
      text: {
        body: mensaje
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("✅ Mensaje enviado:", data);
    return data;
  } catch (error) {
    console.error("❌ Error enviando mensaje:", error);
    return null;
  }
}

// ====== FUNCIÓN: Procesar evento de Messenger ======
async function procesarEvento(evento) {
  console.log("📨 Evento recibido:", JSON.stringify(evento, null, 2));

  const { messaging } = evento;
  
  if (!messaging || !messaging.length) return;

  for (const msg of messaging) {
    const senderID = msg.sender?.id;
    const recipientID = msg.recipient?.id;
    const postback = msg.postback;
    const message = msg.message;

    console.log(`📱 De: ${senderID}, Para: ${recipientID}`);

    // Si es un postback (clic en botón)
    if (postback && postback.payload) {
      const payload = postback.payload;
      console.log(`🔘 Payload recibido: ${payload}`);

      // Buscar el producto
      const producto = PRODUCTOS[payload];
      
      if (producto) {
        // ===== MENSAJE 1: Al propietario =====
        const mensajeAlDueno = `
📲 *NUEVO LEAD - WattUp Audio*

Cliente: ${msg.sender?.name || "Cliente anónimo"}
ID: ${senderID}
Producto: ${producto.emoji} ${producto.nombre}
Hora: ${new Date().toLocaleString()}

👉 Responde en Messenger o contacta directamente.
        `.trim();

        await enviarMensajeWhatsApp(OWNER_WHATSAPP, mensajeAlDueno);

        // ===== MENSAJE 2: Al cliente =====
        const mensajeAlCliente = `
✅ *¡Gracias por tu interés!*

Seleccionaste: ${producto.emoji} ${producto.nombre}

Nos pondremos en contacto en las próximas 2 horas para brindarte más información.

¿Alguna pregunta? Estamos aquí para ayudarte.
        `.trim();

        await enviarMensajeWhatsApp(`+${senderID}`, mensajeAlCliente);
      }
    }

    // Si es un mensaje de texto
    if (message && message.text) {
      const texto = message.text.toLowerCase();
      console.log(`💬 Mensaje: ${texto}`);

      // Respuesta automática
      const respuesta = `
Hola 👋

Gracias por tu mensaje. Nuestro equipo te responderá pronto.

En el Messenger anterior puedes seleccionar el producto que te interesa.
      `.trim();

      await enviarMensajeWhatsApp(`+${senderID}`, respuesta);
    }
  }
}

// ====== SERVIDOR HTTP ======
const server = http.createServer(async (req, res) => {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const query = url.searchParams;

  console.log(`${method} ${pathname}`);

  // ===== VERIFICACIÓN DEL WEBHOOK (GET) =====
  if (method === "GET" && pathname === "/webhook") {
    const mode = query.get("hub.mode");
    const token = query.get("hub.verify_token");
    const challenge = query.get("hub.challenge");

    console.log(`🔐 Modo: ${mode}, Token: ${token}`);

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verificado");
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(challenge);
    } else {
      console.log("❌ Token inválido");
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
    }
    return;
  }

  // ===== RECEPCIÓN DE EVENTOS (POST) =====
  if (method === "POST" && pathname === "/webhook") {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        console.log("📦 Payload recibido:", JSON.stringify(data, null, 2));

        // Procesar eventos de Messenger
        if (data.entry && data.entry[0] && data.entry[0].messaging) {
          await procesarEvento(data.entry[0]);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
      } catch (error) {
        console.error("❌ Error procesando payload:", error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // ===== RUTA RAÍZ =====
  if (pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>WattUp Audio - Webhook</title>
  <style>
    body { font-family: Arial; margin: 40px; background: #f5f5f5; }
    .container { background: white; padding: 20px; border-radius: 8px; max-width: 600px; }
    h1 { color: #333; }
    .status { background: #d4edda; padding: 10px; border-radius: 4px; color: #155724; }
    code { background: #f4f4f4; padding: 5px; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ Webhook WattUp Audio Activo</h1>
    <div class="status">
      <p><strong>Estado:</strong> ✓ Funcionando correctamente</p>
      <p><strong>Endpoint:</strong> /webhook (GET para verificación, POST para eventos)</p>
      <p><strong>Conectado:</strong> Messenger → WhatsApp API</p>
    </div>
    <p>Los mensajes de Messenger serán procesados automáticamente.</p>
  </div>
</body>
</html>
    `);
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
