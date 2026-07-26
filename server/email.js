/* Envío de email transaccional vía Brevo (empresa francesa, datos en la
   UE — es el encargado que declara la política de privacidad). Sin
   BREVO_API_KEY se pasa a modo log: los emails se escriben en
   data/outbox.log para poder probar el flujo completo sin enviar nada. */

import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

const API = 'https://api.brevo.com/v3/smtp/email';

export function configurarCorreo({ apiKey, from, dataDir }) {
  const [, nombre = 'DTF.', direccion = 'aviso@dtf.app'] =
    /^(.*?)\s*<(.+)>$/.exec(from || '') || [null, undefined, from || undefined];

  async function enviar({ to, subject, text, html }) {
    if (!apiKey) {
      appendFileSync(join(dataDir, 'outbox.log'),
        JSON.stringify({ at: new Date().toISOString(), to, subject, text }) + '\n');
      return;
    }
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: nombre, email: direccion },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html
      })
    });
    if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
  }

  return { enviar, modo: apiKey ? 'brevo' : 'log' };
}

/* --- Plantillas ------------------------------------------------------
   La voz de la marca también en el correo: frases cortas, cero adornos.
   HTML mínimo y tipográfico: sin imágenes, sin trackers, cero radius. */

const pie = (unsubUrl) =>
  `\n\n—\nDTF. Solo mayores de 18 años.\nDarse de baja (un clic, de verdad): ${unsubUrl}`;

const htmlBase = (cuerpo, unsubUrl) => `<!DOCTYPE html>
<html lang="es"><body style="margin:0;background:#f3f2f2;color:#201e1d;font-family:Archivo,system-ui,-apple-system,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
<p style="margin:0;font-weight:800;font-size:24px;letter-spacing:-.02em;">DTF<span style="color:#ec3013;">.</span></p>
${cuerpo}
<p style="margin:28px 0 0;padding-top:14px;border-top:2px solid #201e1d;font-size:12.5px;color:#605d5d;">
DTF. Solo mayores de 18 años.<br>
<a href="${unsubUrl}" style="color:#ae1800;">Darse de baja</a> — un clic, de verdad.</p>
</div></body></html>`;

const boton = (url, texto) =>
  `<p style="margin:24px 0 0;"><a href="${url}" style="display:inline-block;background:#dd2b0f;color:#ffffff;font-weight:600;font-size:16px;padding:17px 22px;text-decoration:none;">${texto}</a></p>
<p style="margin:14px 0 0;font-size:12.5px;color:#605d5d;">Si el botón no va, copia esto en el navegador:<br>${url}</p>`;

export const plantillas = {
  confirmar: (confirmUrl, unsubUrl) => ({
    subject: 'Confirma tu email — y dentro.',
    text: `Un clic y estás en la lista. Si no has sido tú, ignora este email y no volverás a saber de nosotros.\n\nConfirmar: ${confirmUrl}\n\nEl enlace caduca en 7 días — aquí caduca todo.${pie(unsubUrl)}`,
    html: htmlBase(`
<h1 style="margin:28px 0 0;font-weight:800;font-size:28px;line-height:1.1;letter-spacing:-.015em;">Un clic y estás dentro.</h1>
<p style="margin:16px 0 0;font-size:15.5px;line-height:1.6;color:#444141;">Confirma tu email y tu sitio en la lista queda guardado. Si no has sido tú, ignora este correo y no volverás a saber de nosotros.</p>
${boton(confirmUrl, 'Confirmar mi email')}
<p style="margin:16px 0 0;font-size:13.5px;color:#605d5d;">El enlace caduca en 7 días — aquí caduca todo.</p>`, unsubUrl)
  }),

  yaDentro: (panelUrl, unsubUrl) => ({
    subject: 'Ya estabas dentro.',
    text: `Ese email ya está en la lista, así que nada que hacer: tu sitio sigue guardado.\n\nTu panel: ${panelUrl}${pie(unsubUrl)}`,
    html: htmlBase(`
<h1 style="margin:28px 0 0;font-weight:800;font-size:28px;line-height:1.1;letter-spacing:-.015em;">Ya estabas dentro.</h1>
<p style="margin:16px 0 0;font-size:15.5px;line-height:1.6;color:#444141;">Ese email ya está en la lista: tu sitio sigue guardado y el aviso sonará igual. Si quieres ver tu puesto o tocar tus preferencias, entra en tu panel.</p>
${boton(panelUrl, 'Ir a mi panel')}`, unsubUrl)
  }),

  entrar: (loginUrl, unsubUrl) => ({
    subject: 'Tu enlace para entrar.',
    text: `Aquí tienes tu enlace de acceso. Caduca en 15 minutos y solo funciona una vez que entres.\n\nEntrar: ${loginUrl}\n\nSi no lo has pedido tú, ignóralo: sin ese clic no entra nadie.${pie(unsubUrl)}`,
    html: htmlBase(`
<h1 style="margin:28px 0 0;font-weight:800;font-size:28px;line-height:1.1;letter-spacing:-.015em;">Tu enlace para entrar.</h1>
<p style="margin:16px 0 0;font-size:15.5px;line-height:1.6;color:#444141;">Caduca en 15 minutos — aquí caduca todo. Si no lo has pedido tú, ignóralo: sin ese clic no entra nadie.</p>
${boton(loginUrl, 'Entrar en mi panel')}`, unsubUrl)
  }),

  ventanaAbierta: (horaCierre, unsubUrl, webUrl) => ({
    subject: 'Acaba de abrir.',
    text: `La ventana está abierta. Cierra a las ${horaCierre} y no vuelve hasta que vuelva.\n\n${webUrl}${pie(unsubUrl)}`,
    html: htmlBase(`
<h1 style="margin:28px 0 0;font-weight:800;font-size:28px;line-height:1.1;letter-spacing:-.015em;">Acaba de abrir.</h1>
<p style="margin:16px 0 0;font-size:15.5px;line-height:1.6;color:#444141;">Cierra a las <strong>${horaCierre}</strong> y no vuelve hasta que vuelva. Lo que no se aprovecha, caduca.</p>
${boton(webUrl, 'Estoy dentro')}`, unsubUrl)
  })
};
