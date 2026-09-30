// WattUp Audio - Bot de WhatsApp (respuestas fijas, sin IA)
// Responde SOLO con los mensajes definidos abajo.
// Variables de entorno en Vercel: WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN

const MSG = {
  hola: `¡Hola! 👋 Gracias por escribir a WattUp Audio.
¿Qué parlante te interesó? Responde con el número:

1️⃣ Marshall Emberton II Crema
2️⃣ Marshall Emberton II Negro/Acero
3️⃣ Marshall Middleton Crema
4️⃣ Bose SoundLink Home Plata`,

  emb2crema: `🎵 Marshall Emberton II – Crema
💵 Bs. 2.100 · queda 1 unidad
🔋 +30 horas de batería
💧 Resistente al agua y polvo (IP67)
🔊 Sonido 360°
✅ Nuevo, con garantía
¿Te lo reservo? 😊 Escribe *reservar*`,

  emb2negro: `🎵 Marshall Emberton II – Negro/Acero
💵 Bs. 2.000 · quedan 2 unidades
🔋 +30 horas de batería
💧 Resistente al agua y polvo (IP67)
🔊 Sonido 360°
✅ Nuevo, con garantía
¿Te lo reservo? 😊 Escribe *reservar*`,

  middleton: `🎵 Marshall Middleton – Crema
💵 Bs. 3.500 · queda 1 unidad
🔋 +20 horas de batería
💧 Resistente al agua y polvo (IP67)
🔊 Sonido estéreo potente
🔌 Sirve como powerbank para cargar tu celular
✅ Nuevo, con garantía
¿Te lo reservo? 😊 Escribe *reservar*`,

  bosehome: `🎵 Bose SoundLink Home – Plata
💵 Bs. 3.563 · queda 1 unidad
🔋 Hasta 9 horas de batería
🏠 Diseño elegante para casa u oficina
🔊 Sonido estéreo Bose
🔗 Se conecta con otro SoundLink Home para sonido estéreo
✅ Nuevo, con garantía
¿Te lo reservo? 😊 Escribe *reservar*`,

  emberton: `Tenemos el Marshall Emberton II en dos colores:
1️⃣ Crema – Bs. 2.100
2️⃣ Negro/Acero – Bs. 2.000
¿Cuál te interesa?`,

  entrega: `🚚 Delivery en Santa Cruz GRATIS o retiro en Av. Beni entre 1er y 2do anillo. ¿Dónde estás?`,

  pago: `💳 QR/transferencia o efectivo al recibir. Mándame el comprobante por aquí ✅`,

  datos: `¡Genial! 🙌 Pásame nombre, dirección y teléfono para coordinar la entrega.`,

  gracias: `¡A ti! 😊 Cualquier duda, aquí estamos.`,

  otro: `¡Gracias por tu mensaje! 😊 En breve te responde una persona de nuestro equipo.
Mientras tanto, escribe *menu* para ver los parlantes disponibles.`,
};

// Palabras clave -> respuesta. El orden importa: se usa la primera que coincida.
const REGLAS = [
  { r: /^\s*1\s*$/, k: "emb2crema" },
  { r: /^\s*2\s*$/, k: "emb2negro" },
  { r: /^\s*3\s*$/, k: "middleton" },
  { r: /^\s*4\s*$/, k: "bosehome" },
  { r: /middleton/, k: "middleton" },
  { r: /bose|soundlink|home|plata/, k: "bosehome" },
  { r: /negro|acero/, k: "emb2negro" },
  { r: /emberton.*crema|crema.*emberton/, k: "emb2crema" },
  { r: /emberton/, k: "emberton" },
  { r: /reserv|compr|lo quiero|quiero|apart/, k: "datos" },
  { r: /entrega|delivery|envi|domicilio|retir|donde (estan|queda)/, k: "entrega" },
  { r: /pago|pagar|qr|transfer|efectivo|tarjeta/, k: "pago" },
  { r: /gracias/, k: "gracias" },
  { r: /hola|buen(as|os)|info|precio|menu|disponible|stock|parlante|marshall/, k: "hola" },
];

const normalizar = (t) =>
  (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function elegirRespuesta(texto) {
  const t = normalizar(texto);
  const regla = REGLAS.find((x) => x.r.test(t));
  return MSG[regla ? regla.k : "otro"];
}

async function enviar(to, body) {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
  if (!res.ok) console.error("Error al enviar:", await res.text());
}

const procesados = new Set(); // evita responder dos veces si Meta reintenta

export default async function handler(req, res) {
  // Verificación del webhook (Meta Developers)
  if (req.method === "GET") {
    const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;
    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.status(403).send("Forbidden");
  }

  if (req.method === "POST") {
    try {
      const value = req.body?.entry?.[0]?.changes?.[0]?.value;
      const msg = value?.messages?.[0];
      if (msg && !procesados.has(msg.id)) {
        procesados.add(msg.id);
        const texto = msg.type === "text" ? msg.text.body
          : msg.type === "button" ? msg.button.text
          : ""; // audios, fotos, etc. -> respuesta "otro"
        await enviar(msg.from, elegirRespuesta(texto));
      }
    } catch (e) {
      console.error(e);
    }
    return res.status(200).send("OK"); // siempre 200 para que Meta no reintente
  }

  return res.status(405).send("Method Not Allowed");
}
