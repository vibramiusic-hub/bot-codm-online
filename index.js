import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    delay
} from '@whiskeysockets/baileys';

import { Boom } from '@hapi/boom';

const NUMERO_BOT = '593999045641';
const NOMBRE_COMUNIDAD = 'CODM BLACK MARKET VERIFIED';

// IDs confirmados en tus logs de Railway.
const IDS_AUTORIZADOS_MANUALES = new Set([
    '120363431795663247@g.us', // Comunidad
    '120363430541418283@g.us'  // General
]);

const gruposPermitidos = new Set(IDS_AUTORIZADOS_MANUALES);
let comunidadId = null;
let reconnecting = false;
let refreshTimer = null;


// ======================================================
// NORMALIZAR TEXTO
// ======================================================

function normalizar(texto = '') {
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}


// ======================================================
// EXTRAER TEXTO DEL MENSAJE
// ======================================================

function extraerTexto(msg) {
    const message = msg?.message;

    if (!message) {
        return '';
    }

    return (
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        message.documentMessage?.caption ||
        ''
    );
}


// ======================================================
// COMPROBAR GRUPO AUTORIZADO
// ======================================================

function grupoAutorizado(id) {
    return Boolean(
        id &&
        gruposPermitidos.has(id)
    );
}


// ======================================================
// DETECTAR COMUNIDAD Y GRUPOS
// ======================================================

async function detectarComunidad(sock) {

    try {

        const grupos =
            await sock.groupFetchAllParticipating();

        const nombreBuscado =
            normalizar(NOMBRE_COMUNIDAD);


        // Conservamos siempre los IDs confirmados
        gruposPermitidos.clear();

        for (
            const id of IDS_AUTORIZADOS_MANUALES
        ) {
            gruposPermitidos.add(id);
        }


        comunidadId = null;


        console.log('');
        console.log(
            '=================================================='
        );
        console.log(
            '🔎 BUSCANDO COMUNIDAD Y GRUPOS'
        );
        console.log(
            '=================================================='
        );


        for (
            const id of Object.keys(grupos)
        ) {

            const grupo =
                grupos[id];

            const nombre =
                grupo?.subject ||
                'Sin nombre';


            console.log(
                `📋 ${nombre}`
            );

            console.log(
                `🆔 ${id}`
            );


            if (
                normalizar(nombre) ===
                nombreBuscado
            ) {

                comunidadId = id;

                gruposPermitidos.add(id);


                console.log(
                    `🏠 COMUNIDAD ENCONTRADA: ${nombre}`
                );

                console.log(
                    `🆔 ID: ${id}`
                );
            }
        }


        // Buscar grupos vinculados
        if (comunidadId) {

            for (
                const id of Object.keys(grupos)
            ) {

                const grupo =
                    grupos[id];


                if (
                    grupo?.linkedParent ===
                    comunidadId
                ) {

                    gruposPermitidos.add(id);


                    console.log(
                        `🔗 GRUPO VINCULADO: ${grupo.subject || id}`
                    );

                    console.log(
                        `🆔 ${id}`
                    );
                }
            }
        }


        console.log('');

        console.log(
            '✅ GRUPOS AUTORIZADOS:'
        );


        for (
            const id of gruposPermitidos
        ) {

            console.log(
                `   🟢 ${id}`
            );
        }


        console.log(
            `✅ Total autorizados: ${gruposPermitidos.size}`
        );


        console.log(
            '=================================================='
        );

        console.log('');


    } catch (error) {

        console.error(
            '❌ Error detectando grupos:',
            error?.message || error
        );
    }
}


// ======================================================
// ENVIAR REGLAS
// ======================================================

async function enviarReglas(
    sock,
    chatId,
    msg
) {

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


// ======================================================
// INICIAR BOT
// ======================================================

async function iniciarBot() {

    const {
        state,
        saveCreds
    } =
        await useMultiFileAuthState(
            'autenticacion_sesion'
        );


    const sock =
        makeWASocket({

            auth: state,

            printQRInTerminal: false,

            browser: [
                'Windows',
                'Chrome',
                '122.0.0.0'
            ],

            defaultQueryTimeoutMs:
                undefined
        });


    // ==================================================
    // GUARDAR SESIÓN
    // ==================================================

    sock.ev.on(
        'creds.update',
        saveCreds
    );


    // ==================================================
    // VINCULACIÓN
    // ==================================================

    if (
        !state.creds.registered
    ) {

        await delay(5000);


        console.log(
            '=================================================='
        );

        console.log(
            '⚙️ CODM BLACK MARKET - VINCULACIÓN'
        );

        console.log(
            '=================================================='
        );

        console.log(
            `📱 Número: ${NUMERO_BOT}`
        );

        console.log(
            '⏳ Generando código...'
        );


        try {

            const codigo =
                await sock.requestPairingCode(
                    NUMERO_BOT.trim()
                );


            console.log(
                `🔑 CÓDIGO: ${codigo}`
            );

            console.log(
                '👉 WhatsApp → Dispositivos vinculados → Vincular con código'
            );


        } catch (error) {

            console.error(
                '❌ Error generando código:',
                error?.message || error
            );
        }


        console.log(
            '=================================================='
        );
    }


    // ==================================================
    // CONEXIÓN
    // ==================================================

    sock.ev.on(
        'connection.update',
        async (update) => {

            const {
                connection,
                lastDisconnect
            } = update;


            if (
                connection === 'open'
            ) {

                reconnecting = false;


                console.log('');

                console.log(
                    '=================================================='
                );

                console.log(
                    '✅ BOT CONECTADO A WHATSAPP'
                );

                console.log(
                    `🏠 ${NOMBRE_COMUNIDAD}`
                );

                console.log(
                    '=================================================='
                );


                await detectarComunidad(
                    sock
                );


                if (refreshTimer) {
                    clearInterval(refreshTimer);
                }


                refreshTimer =
                    setInterval(
                        () => {

                            detectarComunidad(
                                sock
                            ).catch(
                                (error) => {

                                    console.error(
                                        '❌ Error actualizando grupos:',
                                        error?.message || error
                                    );
                                }
                            );

                        },
                        60000
                    );
            }


            if (
                connection === 'close'
            ) {

                if (refreshTimer) {

                    clearInterval(
                        refreshTimer
                    );

                    refreshTimer = null;
                }


                const statusCode =
                    lastDisconnect?.error
                        instanceof Boom

                        ? lastDisconnect.error
                            .output?.statusCode

                        : undefined;


                const debeReconectar =
                    statusCode !==
                    DisconnectReason.loggedOut;


                if (
                    debeReconectar &&
                    !reconnecting
                ) {

                    reconnecting = true;


                    console.log(
                        '🔄 Conexión cerrada. Reconectando en 3 segundos...'
                    );


                    await delay(3000);

                    await iniciarBot();


                } else if (
                    !debeReconectar
                ) {

                    console.log(
                        '❌ Sesión cerrada por WhatsApp.'
                    );

                    console.log(
                        '⚠️ Debes vincular nuevamente.'
                    );
                }
            }
        }
    );


    // ==================================================
    // BIENVENIDA
    // ==================================================

    sock.ev.on(
        'group-participants.update',
        async (e) => {

            try {

                if (
                    !grupoAutorizado(e.id)
                ) {
                    return;
                }


                if (
                    e.action !== 'add'
                ) {
                    return;
                }


                for (
                    const p of e.participants || []
                ) {

                    const numero =
                        p.split('@')[0];


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

                        `⚠️ *Recuerda:* verifica siempre la información y las condiciones antes de realizar cualquier pago.\n\n` +

                        `🔥 *CODM BLACK MARKET*\n` +
                        `_Tu próxima cuenta puede estar aquí._\n\n` +

                        `👉 Escribe *!reglas* para leer el reglamento completo.`;


                    await sock.sendMessage(
                        e.id,
                        {
                            text: mensaje,
                            mentions: [p]
                        }
                    );
                }


            } catch (error) {

                console.error(
                    '❌ Error enviando bienvenida:',
                    error?.message || error
                );
            }
        }
    );


    // ==================================================
    // MENSAJES
    // ==================================================

    sock.ev.on(
        'messages.upsert',
        async (mUpdate) => {

            try {

                const mensajes =
                    mUpdate.messages || [];


                for (
                    const msg of mensajes
                ) {

                    if (
                        !msg?.message ||
                        msg.key?.fromMe
                    ) {
                        continue;
                    }


                    const chatId =
                        msg.key?.remoteJid;


                    const text =
                        extraerTexto(
                            msg
                        ).trim();


                    console.log(
                        '📩 MENSAJE RECIBIDO'
                    );

                    console.log(
                        `🆔 CHAT: ${chatId}`
                    );

                    console.log(
                        `📝 TEXTO: ${text}`
                    );


                    if (
                        !grupoAutorizado(
                            chatId
                        )
                    ) {

                        console.log(
                            `🚫 GRUPO NO AUTORIZADO: ${chatId}`
                        );

                        continue;
                    }


                    const comando =
                        text.toLowerCase();


                    // ==================================
                    // !REGLAS
                    // ==================================

                    if (
                        comando === '!reglas'
                    ) {

                        await enviarReglas(
                            sock,
                            chatId,
                            msg
                        );


                        console.log(
                            '✅ REGLAS ENVIADAS'
                        );
                    }
                }


            } catch (error) {

                console.error(
                    '❌ ERROR PROCESANDO MENSAJE:',
                    error?.message || error
                );
            }
        }
    );
}


// ======================================================
// ARRANCAR
// ======================================================

iniciarBot().catch(
    (error) => {

        console.error(
            '❌ ERROR INICIANDO BOT:',
            error?.message || error
        );

        process.exitCode = 1;
    }
);
