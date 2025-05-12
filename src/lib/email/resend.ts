import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!); // Add ! if you're confident it's set

export async function sendDeveloperNotification(
  email: string,
  decision: 'accepted' | 'rejected',
  feedback: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'MoonDev Challenge <onboarding@resend.dev>',
      to: [email],
      subject: `Application Decision: ${decision === 'accepted' ? 'Welcome to the Team!' : 'Application Status'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: ${decision === 'accepted' ? '#10B981' : '#EF4444'};">
            ${decision === 'accepted' ? 'Congratulations! 🎉' : 'Thank You for Your Application'}
          </h1>
          <p>Dear Applicant,</p>
          <p>
            ${decision === 'accepted'
              ? 'We are excited to inform you that you have been selected to join our team!'
              : 'After careful review, we regret to inform you that we will not be moving forward with your application at this time.'}
          </p>
          <h2>Feedback:</h2>
          <p>${feedback || 'No specific feedback provided.'}</p>
          <p>Best regards,<br>MoonDev Challenge Team</p>
        </div>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Email sending failed:', err);
    return false;
  }
}
