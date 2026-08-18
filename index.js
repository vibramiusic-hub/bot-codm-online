import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    delay
} from '@whiskeysockets/baileys';

import { Boom } from '@hapi/boom';

const NUMERO_BOT = "593999045641";
const NOMBRE_COMUNIDAD = "CODM BLACK MARKET VERIFIED";

// Grupos autorizados de la comunidad
const gruposPermitidos = new Set();
let comunidadId = null;


// ======================================================
// NORMALIZAR NOMBRES
// ======================================================

function normalizar(texto = "") {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}


// ======================================================
// DETECTAR COMUNIDAD Y GRUPOS VINCULADOS
// ======================================================

async function detectarComunidad(sock) {
    try {
        const grupos = await sock.groupFetchAllParticipating();

        const nombreBuscado = normalizar(NOMBRE_COMUNIDAD);

        comunidadId = null;
        gruposPermitidos.clear();

        console.log("");
        console.log("==================================================");
        console.log("🔎 BUSCANDO COMUNIDAD");
        console.log("==================================================");

        // Buscar la comunidad por nombre
        for (const id of Object.keys(grupos)) {
            const grupo = grupos[id];

            console.log(`📋 ${grupo.subject || "Sin nombre"}`);
            console.log(`🆔 ${id}`);

            if (
                normalizar(grupo.subject || "") ===
                nombreBuscado
            ) {
                comunidadId = id;

                console.log("");
                console.log(
                    `🏠 COMUNIDAD ENCONTRADA: ${grupo.subject}`
                );
                console.log(`🆔 ID: ${id}`);
            }
        }

        // Si encontramos la comunidad,
        // detectar sus grupos vinculados
        if (comunidadId) {

            gruposPermitidos.add(comunidadId);

            for (const id of Object.keys(grupos)) {
                const grupo = grupos[id];

                if (grupo.linkedParent === comunidadId) {
                    gruposPermitidos.add(id);

                    console.log(
                        `🔗 Grupo vinculado: ${grupo.subject}`
                    );
                    console.log(`🆔 ${id}`);
                }
            }

            console.log("");
            console.log(
                `✅ Grupos autorizados: ${gruposPermitidos.size}`
            );

        } else {

            console.log("");
            console.log(
                "⚠️ NO SE ENCONTRÓ LA COMUNIDAD."
            );

            console.log(
                `Busca exactamente: ${NOMBRE_COMUNIDAD}`
            );
        }

        console.log("==================================================");
        console.log("");

    } catch (error) {
        console.error(
            "❌ Error detectando comunidad:",
            error?.message || error
        );
    }
}


// ======================================================
// COMPROBAR SI EL GRUPO ESTÁ AUTORIZADO
// ======================================================

function grupoAutorizado(id) {
    return id && gruposPermitidos.has(id);
}


// ======================================================
// INICIAR BOT
// ======================================================

async function iniciarBot() {

    const { state, saveCreds } =
        await useMultiFileAuthState(
            "autenticacion_sesion"
        );

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: [
            "Windows",
            "Chrome",
            "122.0.0.0"
        ],
        defaultQueryTimeoutMs: undefined
    });


    // ==================================================
    // GUARDAR CREDENCIALES
    // ==================================================

    sock.ev.on(
        "creds.update",
        saveCreds
    );


    // ==================================================
    // CÓDIGO DE VINCULACIÓN
    // ==================================================

    if (!state.creds.registered) {

        await delay(5000);

        console.log(
            "=================================================="
        );

        console.log(
            "⚙️ CODM BLACK MARKET - VINCULACIÓN"
        );

        console.log(
            "=================================================="
        );

        console.log(
            `📱 Número: ${NUMERO_BOT}`
        );

        console.log(
            "⏳ Generando código..."
        );

        try {

            const codigo =
                await sock.requestPairingCode(
                    NUMERO_BOT.trim()
                );

            console.log("");
            console.log(
                `🔑 CÓDIGO: ${codigo}`
            );

            console.log(
                "👉 WhatsApp → Dispositivos vinculados"
            );

            console.log(
                "👉 Vincular con código"
            );

        } catch (error) {

            console.error(
                "❌ Error generando código:",
                error?.message || error
            );
        }

        console.log(
            "=================================================="
        );
    }


    // ==================================================
    // CONEXIÓN
    // ==================================================

    sock.ev.on(
        "connection.update",
        async (update) => {

            const {
                connection,
                lastDisconnect
            } = update;


            if (connection === "open") {

                console.log("");
                console.log(
                    "=================================================="
                );

                console.log(
                    "✅ BOT CONECTADO A WHATSAPP"
                );

                console.log(
                    "🏠 CODM BLACK MARKET VERIFIED"
                );

                console.log(
                    "=================================================="
                );

                // Detectar comunidad automáticamente
                await detectarComunidad(sock);

            }


            if (connection === "close") {

                const debeReconectar =
                    lastDisconnect?.error instanceof Boom
                        ? lastDisconnect.error.output.statusCode !==
                          DisconnectReason.loggedOut
                        : true;


                if (debeReconectar) {

                    console.log(
                        "🔄 Conexión cerrada."
                    );

                    console.log(
                        "🔄 Reconectando..."
                    );

                    await iniciarBot();

                } else {

                    console.log(
                        "❌ Sesión cerrada."
                    );

                    console.log(
                        "⚠️ Debes vincular nuevamente."
                    );
                }
            }
        }
    );


    // ==================================================
    // ACTUALIZAR GRUPOS CADA 60 SEGUNDOS
    // ==================================================

    setInterval(
        async () => {

            if (
                sock.user &&
                sock.ws?.isOpen
            ) {
                await detectarComunidad(sock);
            }

        },
        60000
    );


    // ==================================================
    // BIENVENIDA
    // ==================================================

    sock.ev.on(
        "group-participants.update",
        async (e) => {

            // Ignorar grupos fuera de la comunidad
            if (!grupoAutorizado(e.id)) {
                return;
            }

            if (e.action !== "add") {
                return;
            }


            for (const p of e.participants) {

                const numero =
                    p.split("@")[0];

                const mencion =
                    `@${numero}`;


                const mensaje =
                    `🖤🔥 *¡BIENVENIDO/A A CODM BLACK MARKET!* 🔥🖤\n\n` +

                    `👤 ${mencion}, ya formas parte de nuestra comunidad.\n\n` +

                    `💎 *Compra • Venta • Intercambio de cuentas CODM*\n\n` +

                    `🛡️ Seguridad\n` +
                    `🤝 Confianza\n` +
                    `📋 Información clara\n` +
                    `⚡ Comunidad activa\n\n` +

                    `📜 Antes de publicar, revisa las reglas del grupo.\n\n` +

                    `⚠️ *Recuerda:* verifica siempre la información ` +
                    `y las condiciones antes de realizar cualquier pago.\n\n` +

                    `🔥 *CODM BLACK MARKET*\n` +
                    `_Tu próxima cuenta puede estar aquí._\n\n` +

                    `👉 Escribe *!reglas* para leer el reglamento completo.`;


                try {

                    await sock.sendMessage(
                        e.id,
                        {
                            text: mensaje,
                            mentions: [p]
                        }
                    );

                } catch (error) {

                    console.error(
                        "❌ Error enviando bienvenida:",
                        error?.message || error
                    );
                }
            }
        }
    );


    // ==================================================
    // COMANDOS
    // ==================================================

    sock.ev.on(
        "messages.upsert",
        async (mUpdate) => {

            try {

                const msg =
                    mUpdate.messages?.[0];


                if (
                    !msg ||
                    !msg.message ||
                    msg.key.fromMe
                ) {
                    return;
                }


                const chatId =
                    msg.key.remoteJid;


                // SOLO grupos de tu comunidad
                if (
                    !grupoAutorizado(chatId)
                ) {
                    return;
                }


                const text =
                    msg.message.conversation ||
                    msg.message.extendedTextMessage?.text ||
                    "";


                const comando =
                    text.trim().toLowerCase();


                // ======================================
                // !REGLAS
                // ======================================

                if (comando === "!reglas") {

                    const reglas =

                        `🖤 *REGLAS — CODM BLACK MARKET*\n\n` +

                        `01 • 🤝 *RESPETO*\n` +
                        `Trata a todos los miembros con respeto. ` +
                        `No se permiten insultos, amenazas, acoso ni conflictos.\n\n` +

                        `02 • 🚫 *CERO ESTAFAS*\n` +
                        `Cualquier intento de engaño, comprobante falso ` +
                        `o información falsa será motivo de sanción y expulsión.\n\n` +

                        `03 • 📢 *PUBLICACIONES CLARAS*\n` +
                        `Toda publicación debe incluir:\n` +
                        `- Cuenta disponible\n` +
                        `- Precio\n` +
                        `- Características principales\n` +
                        `- Forma de contacto\n\n` +

                        `04 • 💰 *NEGOCIA CON RESPONSABILIDAD*\n` +
                        `Antes de pagar, revisa cuidadosamente la información ` +
                        `y acuerda las condiciones del trato.\n\n` +

                        `05 • 🔎 *PRUEBAS*\n` +
                        `Cuando sea necesario, solicita pruebas razonables ` +
                        `de lo que se está ofreciendo.\n\n` +

                        `06 • 🔐 *PROTEGE TUS DATOS*\n` +
                        `Nunca publiques contraseñas, códigos de verificación, ` +
                        `documentos ni información privada.\n\n` +

                        `07 • 🚫 *NO SPAM*\n` +
                        `No inundes el grupo con publicaciones repetidas, ` +
                        `enlaces innecesarios o publicidad no autorizada.\n\n` +

                        `08 • ⚠️ *NADA DE SUPLANTACIONES*\n` +
                        `Está prohibido hacerse pasar por otro vendedor, ` +
                        `administrador o miembro.\n\n` +

                        `09 • 🛡️ *ADMINISTRACIÓN*\n` +
                        `La administración puede eliminar publicaciones ` +
                        `o expulsar usuarios que incumplan las reglas.\n\n` +

                        `10 • 📌 *RESPONSABILIDAD*\n` +
                        `Cada comprador y vendedor debe verificar el trato ` +
                        `antes de realizar cualquier pago.\n\n` +

                        `━━━━━━━━━━━━━━━━━━\n\n` +

                        `🖤 *CODM BLACK MARKET VERIFIED*\n` +
                        `🔥 Compra • Venta • Intercambio\n` +
                        `🛡️ Respeto • Transparencia • Comunidad`;


                    await sock.sendMessage(
                        chatId,
                        {
                            text: reglas
                        },
                        {
                            quoted: msg
                        }
                    );
                }

            } catch (error) {

                console.error(
                    "❌ Error procesando mensaje:",
                    error?.message || error
                );
            }
        }
    );
}


// ======================================================
// ARRANCAR BOT
// ======================================================

iniciarBot().catch(
    (error) => {

        console.error(
            "❌ Error iniciando el bot:",
            error?.message || error
        );
    }
);
