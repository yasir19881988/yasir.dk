const { EmailClient } = require("@azure/communication-email");

module.exports = async function (context, req) {
    // 1. Hent felterne fra din HTML-formular
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
        context.res = {
            status: 400,
            body: "Venligst udfyld alle felter."
        };
        return;
    }

    // 2. Forbind til Azures gratis mailsystem (Azure Communication Services)
    // Forbindelsesstrengen gemmes sikkert i Azures indstillinger bagefter
    const connectionString = process.env.AZURE_EMAIL_CONNECTION_STRING;
    const client = new EmailClient(connectionString);

    try {
        // 3. Send mailen afsted til dig selv
        const emailMessage = {
            senderAddress: "no-reply@yasir.dk", // Skal verificeres i Azure bagefter
            content: {
                subject: `Ny besked fra yasir.dk: ${subject || 'Kontaktformular'}`,
                plainText: `Navn: ${name}\nE-mail: ${email}\n\nBesked:\n${message}`,
            },
            recipients: {
                to: [{ address: "yasir@yasir.dk" }],
            },
        };

        await client.beginSend(emailMessage);

        // 4. Send succes-svar tilbage til din HTML-side
        context.res = {
            status: 200,
            body: "Beskeden er sendt med succes!"
        };
    } catch (error) {
        context.res = {
            status: 500,
            body: "Der skete en fejl under afsendelse af mailen."
        };
    }
};