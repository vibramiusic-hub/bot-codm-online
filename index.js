import makeWASocket, { DisconnectReason, useMultiFileAuthState, delay } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_auth');
    const sock = makeWASocket({ 
        auth: state, 
        printQRInTerminal: false, 
        browser: ["Windows", "Chrome", "122.0.0.0"],
        defaultQueryTimeoutMs: undefined 
    });
    
    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        await delay(3000);
        console.clear();
        console.log("==================================================");
        console.log("⚙️  VINCULACIÓN POR CÓDIGO - CODM BLACK MARKET  ⚙️");
        console.log("==================================================");
        console.log("📱 Ingresa tu número con código de país (Ej: 593999045641)");
        const numero = await question('> ');
        console.log("\n⏳ Generando código de vinculación...");
        const codigo = await sock.requestPairingCode(numero.trim());
        console.log(`\n🔑 TU CÓDIGO DE 8 DÍGITOS ES: ${codigo}\n`);
        console.log("👉 Copia el código anterior.");
        console.log("👉 Entra a WhatsApp Business -> Dispositivos Vinculados -> Vincular con código.");
        console.log("==================================================");
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const debeReconectar = (lastDisconnect.error instanceof Boom) ? 
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
            if (debeReconectar) iniciarBot();
        } else if (connection === 'open') {
            console.log('\n¡Bot de CODM BLACK MARKET conectado con éxito a WhatsApp! 🎉');
        }
    });

    sock.ev.on('group-participants.update', async (e) => {
        if (e.action === 'add') {
            for (const p of e.participants) {
                const m = `@${p.split('@')}`;
                const t = `🖤🔥 *¡BIENVENIDO/A A CODM BLACK MARKET!* 🔥🖤\n\n👤 ${m}, ya formas parte de nuestra comunidad.\n\n💎 *Compra • Venta • Intercambio de cuentas CODM*\n\n🛡️ Seguridad\n🤝 Confianza\n📋 Información clara\n⚡ Comunidad activa\n\n📜 Antes de publicar, revisa las reglas del grupo.\n\n⚠️ *Recuerda:* verifica siempre la información y las condiciones antes de realizar cualquier pago.\n\n🔥 *CODM BLACK MARKET*\n_Tu próxima cuenta puede estar aquí._\n\n👉 Escribe *!reglas* para leer el reglamento completo.`;
                await sock.sendMessage(e.id, { text: t, mentions: [p] });
            }
        }
    });

    sock.ev.on('messages.upsert', async (mUpdate) => {
        try {
            const msg = mUpdate.messages[0];
            if (!msg || !msg.message || msg.key.fromMe) return;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            if (text.trim().toLowerCase() === '!reglas') {
                const r = `🖤 *REGLAS — CODM BLACK MARKET*\n\n01 • 🤝 *RESPETO*\nTrata a todos los miembros con respeto. No se permiten insultos, amenazas, acoso ni conflictos.\n\n02 • 🚫 *CERO ESTAFAS*\nCualquier intento de engaño, comprobante falso o información falsa será motivo de sanción y expulsión.\n\n03 • 📢 *PUBLICACIONES CLARAS*\nToda publicación debe incluir:\n- Cuenta disponible\n- Precio\n- Características principales\n- Forma de contacto\n\n04 • 💰 *NEGOCIA CON RESPONSABILIDAD*\nAntes de pagar, revisa cuidadosamente la información proporcionada y acuerda las condiciones del trato.\n\n05 • 🔎 *PRUEBAS*\nCuando sea necesario, solicita pruebas razonables de lo que se está ofreciendo.\n\n06 • 🔐 *PROTEGE TUS DATOS*\nNunca publiques contraseñas, códigos de verificación, documentos ni información privada.\n\n07 • 🚫 *NO SPAM*\nNo inundes el grupo con publicaciones repetidas, enlaces innecesarios o publicidad no autorizada.\n\n08 • ⚠️ *NADA DE SUPLANTACIONES*\nEstá prohibido hacerse pasar por otro vendedor, administrador o miembro.\n\n09 • 🛡️ *ADMINISTRACIÓN*\nLa administración puede eliminar publicaciones o expulsar usuarios que incumplan las reglas.\n\n10 • 📌 *RESPONSABILIDAD*\nCada comprador y vendedor debe verificar el trato antes de realizar cualquier pago. La comunidad debe utilizarse de forma responsable.\n\n━━━━━━━━━━━━━━━━━━\n\n🖤 *CODM BLACK MARKET*\n🔥 Compra • Venta • Intercambio\n🛡️ Respeto • Transparencia • Comunidad`;
                await sock.sendMessage(msg.key.remoteJid, { text: r }, { quoted: msg });
            }
        } catch (err) { console.error(err); }
    });
}
iniciarBot();
