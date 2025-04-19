const { Resend } = require('resend');

// Initialize Resend with the API key from environment variabless
const resend = new Resend(process.env.RESEND_API_KEY);

// *** IMPORTANT: Ensure these environment variables are set in Vercel!
// SENDER_EMAIL: Your VERIFIED email address in Resend (used in the 'from' field for BOTH emails)
// OWNER_NOTIFICATION_EMAIL: Your email address where you want to receive NOTIFICATIONS about bookings
const senderEmail = process.env.SENDER_EMAIL;
const ownerNotificationEmail = process.env.OWNER_NOTIFICATION_EMAIL; // Renamed from RECIPIENT_EMAIL for clarity

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // Parse the request body - contains user's form data
  const { name, email, phone, date, time, message } = req.body;

  // Basic validation
  if (!name || !email || !date || !time) {
    return res.status(400).json({ success: false, message: 'Missing required fields (name, email, date, time).' });
  }

  // Validate sender and owner notification emails from environment variables
  if (!senderEmail || !ownerNotificationEmail) {
       console.error("Email configuration error: SENDER_EMAIL or OWNER_NOTIFICATION_EMAIL environment variable is not set.");
       return res.status(500).json({ success: false, message: 'Server email configuration error.' });
  }

   // --- Prepare the EMAIL TO THE SITE OWNER (NOTIFICATION) ---
   const ownerMsg = {
    to: ownerNotificationEmail, // Send to the owner's email
    from: senderEmail, // Must use a verified sender email/domain
    reply_to: email, // Set reply-to to the user's email
    subject: `New Appointment Booked by ${name}`, // Clear subject for owner
    text: `
      A new appointment has been booked.

      Name: ${name}
      Email: ${email}
      Phone: ${phone || 'N/A'}
      Date: ${date}
      Time: ${time}
      Message: ${message || 'No message provided.'}
    `,
    html: `
      <p>A new appointment has been booked.</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>Message:</strong><br/>${message ? message.replace(/\n/g, '<br/>') : 'No message provided.'}</p>
    `,
   };

   // --- Prepare the EMAIL TO THE USER (CONFIRMATION) ---
   const userMsg = {
    to: email, // Send to the user's email address from the form
    from: senderEmail, // Must use a verified sender email/domain
    reply_to: ownerNotificationEmail, // Set reply-to to the owner's email
    subject: `Your Appointment with John Doe is Confirmed!`, // Clear subject for user
    text: `
      Hi ${name},

      Thank you for booking an appointment!

      Your appointment is scheduled for:
      Date: ${date}
      Time: ${time}

      We look forward to speaking with you!

      Best regards,
      John Doe
    `,
    html: `
      <p>Hi ${name},</p>
      <p>Thank you for booking an appointment!</p>
      <p>Your appointment is scheduled for:</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p>We look forward to speaking with you!</p>
      <p>Best regards,<br/>John Doe</p>
    `,
   };


  try {
    // Send BOTH emails in parallel
    const [ownerResponse, userResponse] = await Promise.all([
        resend.emails.send(ownerMsg),
        resend.emails.send(userMsg)
    ]);

    console.log('Emails sent successfully:');
    console.log('Owner Notification:', ownerResponse);
    console.log('User Confirmation:', userResponse);

    res.status(200).json({ success: true, message: 'Appointment request sent successfully, confirmation email dispatched!' });

  } catch (error) {
    console.error('Error sending emails:', error);

    let errorMessage = 'Failed to send one or both appointment emails.';
    if (error.message) errorMessage += ` Details: ${error.message}.`;

    // Log specific details if available (Resend errors often have a 'name' or 'response' property)
     if (process.env.NODE_ENV !== 'production') {
         console.error('Full error object:', error);
     }


    res.status(500).json({ success: false, message: errorMessage, error: error });
  }
};
