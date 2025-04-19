const { Resend } = require('resend');

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

// *** IMPORTANT: Replace these with your actual VERIFIED Resend sender email
// *** and the email address you want to RECEIVE the booking notifications.
// *** It's recommended to use environment variables for these as well in production.
const senderEmail = process.env.SENDER_EMAIL || 'your-verified-sender@example.com'; // Replace placeholder if not using env var
const recipientEmail = process.env.RECIPIENT_EMAIL || 'your-recipient-email@example.com'; // Replace placeholder if not using env var


module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // Parse the request body
  const { name, email, phone, date, time, message } = req.body;

  // Basic validation
  if (!name || !email || !date || !time) {
    return res.status(400).json({ success: false, message: 'Missing required fields (name, email, date, time).' });
  }

  // Email content using Resend's format
  // 'from' address MUST be a verified sender/domain in your Resend account.
  // 'to' is the recipient (you).
  // 'reply_to' is the user's email, so you can easily reply to them.
  const msg = {
    to: recipientEmail, // The email address to send the booking notification TO (likely yours)
    from: senderEmail, // The VERIFIED sender email address FROM your Resend account
    reply_to: email, // Set reply-to to the user's email
    subject: `New Appointment Request from ${name}`,
    text: `
      You have a new appointment request!

      Name: ${name}
      Email: ${email}
      Phone: ${phone || 'N/A'}
      Date: ${date}
      Time: ${time}
      Message: ${message || 'No message provided.'}
    `,
    html: `
      <p>You have a new appointment request!</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>Message:</strong><br/>${message ? message.replace(/\n/g, '<br/>') : 'No message provided.'}</p>
    `,
  };

  try {
    // Use Resend's send method
    const data = await resend.emails.send(msg);
    console.log('Resend email sent successfully', data);
    res.status(200).json({ success: true, message: 'Appointment request sent successfully!', data: data });

  } catch (error) {
    console.error('Resend email sending error:', error);

    // Log specific Resend error details if available
    let errorMessage = 'Failed to send appointment request.';
    if (error.name) errorMessage += ` Error Type: ${error.name}.`;
    if (error.message) errorMessage += ` Details: ${error.message}.`;

    // Provide more detailed error info in development logs but not necessarily to the user
    if (process.env.NODE_ENV !== 'production') {
        console.error('Full error object:', error);
    }

    res.status(500).json({ success: false, message: errorMessage, error: error });
  }
};