const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
})

const sendLeadEmail = async (lead) => {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.NOTIFY_EMAIL,
    subject: `New Lead: ${lead.name} — AutomateIQ`,
    html: `
      <h2>New Lead from AutomateIQ Website</h2>
      <p><b>Name:</b> ${lead.name}</p>
      <p><b>Email:</b> ${lead.email}</p>
      <p><b>Phone:</b> ${lead.phone || 'N/A'}</p>
      <p><b>Budget:</b> ${lead.budget || 'N/A'}</p>
      <p><b>Idea:</b> ${lead.idea || 'N/A'}</p>
      <p><b>Template:</b> ${lead.template || 'N/A'}</p>
      <p><b>Source:</b> ${lead.source}</p>
      <p><b>Time:</b> ${new Date().toLocaleString('en-IN')}</p>
    `
  })
}

module.exports = { sendLeadEmail }
