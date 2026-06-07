const { EmailClient } = require("@azure/communication-email");

function resolveInvocation(arg1, arg2) {
  const arg1LooksReq = !!arg1 && (typeof arg1.method === "string" || typeof arg1.url === "string");
  const arg2LooksCtx = !!arg2 && (typeof arg2.log === "function" || Object.prototype.hasOwnProperty.call(arg2, "res"));

  if (arg1LooksReq && arg2LooksCtx) {
    return { context: arg2, req: arg1 };
  }

  return { context: arg1, req: arg2 };
}

function jsonResponse(status, type, message) {
  return {
    status,
    headers: {
      "Content-Type": "application/json"
    },
    body: {
      type,
      message
    }
  };
}

function parseFormEncoded(raw) {
  const out = {};
  if (!raw || typeof raw !== "string") {
    return out;
  }

  raw.split("&").forEach((pair) => {
    if (!pair) {
      return;
    }
    const idx = pair.indexOf("=");
    const key = idx >= 0 ? pair.slice(0, idx) : pair;
    const value = idx >= 0 ? pair.slice(idx + 1) : "";
    const decodedKey = decodeURIComponent(String(key).replace(/\+/g, " "));
    const decodedValue = decodeURIComponent(String(value).replace(/\+/g, " "));
    out[decodedKey] = decodedValue;
  });

  return out;
}

async function normalizeBody(req) {
  let body = req && req.body ? req.body : {};

  // Azure Functions Node v4 request object.
  if ((!body || typeof body !== "object") && req && typeof req.json === "function") {
    try {
      body = await req.json();
    } catch (e) {
      // Ignore and continue with text/raw parsing fallbacks.
    }
  }

  if ((!body || typeof body !== "object") && req && typeof req.text === "function") {
    try {
      body = parseFormEncoded(await req.text());
    } catch (e) {
      // Ignore and continue with fallbacks.
    }
  }

  // Azure Functions may pass form-urlencoded payloads as raw string.
  if (typeof body === "string") {
    body = parseFormEncoded(body);
  }

  // Fallback if parser did not populate req.body.
  if ((!body || typeof body !== "object") && req && req.rawBody) {
    body = parseFormEncoded(req.rawBody);
  }

  if ((!body || typeof body !== "object") && req && req.query) {
    body = req.query;
  }

  function readField(source, key, fallback = "") {
    if (!source) {
      return fallback;
    }

    if (typeof source.get === "function") {
      const viaGet = source.get(key);
      if (viaGet !== undefined && viaGet !== null) {
        return String(viaGet);
      }
    }

    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return String(source[key] ?? "");
    }

    return fallback;
  }

  return {
    name: readField(body, "name", "").trim(),
    email: readField(body, "email", "").trim(),
    subject: readField(body, "subject", "").trim(),
    message: readField(body, "message", "").trim(),
    honeypot: readField(body, "website", "").trim()
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async function (arg1, arg2) {
  const { context, req } = resolveInvocation(arg1, arg2);
  const rawMethod = String((req && (req.method || (req.req && req.req.method))) || "").toUpperCase();
  const methodOverride = String(
    (req && req.headers && (req.headers["x-http-method-override"] || req.headers["X-HTTP-Method-Override"])) || ""
  ).toUpperCase();
  const method = methodOverride || rawMethod;

  if (method === "OPTIONS") {
    context.res = {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    };
    return context.res;
  }

  if (!req || (method !== "POST" && rawMethod !== "POST")) {
    context.res = jsonResponse(
      405,
      "danger",
      `Method not allowed. Received: ${rawMethod || "UNKNOWN"}`
    );
    return context.res;
  }

  const { name, email, subject, message, honeypot } = await normalizeBody(req);

  // Silent spam trap: return success to bots without sending mail.
  if (honeypot) {
    context.res = jsonResponse(200, "success", "Contact form successfully submitted. Thank you, I will get back to you soon!");
    return context.res;
  }

  if (!name || !email || !message) {
    context.res = jsonResponse(400, "danger", "Please fill in name, email and message.");
    return context.res;
  }

  if (!isValidEmail(email)) {
    context.res = jsonResponse(400, "danger", "Please enter a valid email address.");
    return context.res;
  }

  const connectionString = process.env.AZURE_EMAIL_CONNECTION_STRING;
  const senderAddress = process.env.AZURE_EMAIL_SENDER || "no-reply@yasir.dk";
  const recipientAddress = process.env.CONTACT_RECIPIENT_EMAIL || "yasir@yasir.dk";

  if (!connectionString) {
    context.log.error("AZURE_EMAIL_CONNECTION_STRING is missing.");
    context.res = jsonResponse(500, "danger", "There was an error while submitting the form. Please try again later.");
    return context.res;
  }

  try {
    const client = new EmailClient(connectionString);

    const emailMessage = {
      senderAddress,
      content: {
        subject: `Ny besked fra yasir.dk: ${subject || "Kontaktformular"}`,
        plainText: `Emne: ${subject || "Kontaktformular"}\nNavn: ${name}\nE-mail: ${email}\n\nBesked:\n${message}`
      },
      recipients: {
        to: [{ address: recipientAddress }]
      },
      replyTo: [{ address: email }]
    };

    const poller = await client.beginSend(emailMessage);
    await poller.pollUntilDone();

    context.res = jsonResponse(200, "success", "Contact form successfully submitted. Thank you, I will get back to you soon!");
  } catch (error) {
    if (context && typeof context.log === "function") {
      context.log("Contact mail send failed", error);
    }
    context.res = jsonResponse(500, "danger", "There was an error while submitting the form. Please try again later.");
  }

  return context.res;
};
