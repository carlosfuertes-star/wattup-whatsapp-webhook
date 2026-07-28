const PHONE_ID = "715063425004109";
const ACCESS_TOKEN = "103735442216971|2bh7vGc6IsVRiLNPLJpCqgPB8iw4";
const OWNER_WHATSAPP = "+59176524354";
const VERIFY_TOKEN = "wattup_webhook_2026";

const PRODUCTOS = {
  emberton_ii: { nombre: "Emberton II", emoji: "🎵" },
  middleton: { nombre: "Middleton", emoji: "🎶" },
  emberton_iii: { nombre: "Emberton III", emoji: "🎼" }
};

async function enviarMensajeWhatsApp(numero, mensaje) {
  try {
    const url = `https://graph.instagram.com/v18.0/${PHONE_ID}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: numero.replace("+", ""),
      type: "text",
      text: { body: mensaje }
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
    console.error("❌ Error:", error);
    return null;
  }
}

export default async function handler(req, res) {
  const { method } = req;
  
  if (method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verificado");
      res.status(200).send(challenge);
      return;
    } else {
      res.status(403).send("Forbidden");
      return;
    }
  }
  
  if (method === "POST") {
    try {
      const data = req.body;
      
      if (data.entry && data.entry[0] && data.entry[0].messaging) {
        const messaging = data.entry[0].messaging;
        
        if (!messaging || !messaging.length) {
          res.status(200).json({ status: "ok" });
          return;
        }
        
        for (const msg of messaging) {
          const senderID = msg.sender?.id;
          const postback = msg.postback;
          
          if (postback && postback.payload) {
            const payload = postback.payload;
            const producto = PRODUCTOS[payload];
            
            if (producto) {
              const mensajeAlDueno = `📲 NUEVO LEAD - WattUp Audio\n\nCliente ID: ${senderID}\nProducto: ${producto.emoji} ${producto.nombre}\n\nResponde en Messenger.`;
              
              await enviarMensajeWhatsApp(OWNER_WHATSAPP, mensajeAlDueno);
              
              const mensajeAlCliente = `✅ ¡Gracias por tu interés!\n\nSeleccionaste: ${producto.emoji} ${producto.nombre}\n\nNos contactaremos en 2 horas.`;
              
              await enviarMensajeWhatsApp(`+${senderID}`, mensajeAlCliente);
            }
          }
        }
      }
      
      res.status(200).json({ status: "ok" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  
  res.status(405).json({ error: "Method not allowed" });
}
