const nodemailer = require('nodemailer');

let transporter;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    transporter.verify((error) => {
      if (error) {
        console.log('⚠️  Email service error:', error.message);
      } else {
        console.log('✅ Email service ready');
      }
    });
  } catch (error) {
    console.log('⚠️  Email service initialization failed:', error.message);
    transporter = null;
  }
} else {
  console.log('⚠️  Email service not configured (missing SMTP credentials)');
  transporter = null;
}

const emailTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Nunito', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 32px; font-weight: 900; background: linear-gradient(135deg, #6366f1, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .content { color: #374151; line-height: 1.6; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1, #06b6d4); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    .credentials { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; font-family: monospace; }
    .warning { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🎓 ALMTS</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Academic Learning Momentum Tracker System</p>
      <p>This is an automated email. Do not reply to this address.</p>
    </div>
  </div>
</body>
</html>
`;

const sendWelcomeEmail = async (userData) => {
  if (!transporter) return { success: false, error: 'Email service not configured' };
  
  try {
    const { name, email, tempPassword, role, rollNumber, department, loginUrl } = userData;
    
    const content = `
      <h2>Welcome to ALMTS! 👋</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your ALMTS account has been created successfully.</p>
      <div class="credentials">
        <p>📧 <strong>Email:</strong> ${email}</p>
        <p>🔑 <strong>Password:</strong> ${tempPassword}</p>
        <p>👤 <strong>Role:</strong> ${role}</p>
        ${department ? `<p>🏫 <strong>Department:</strong> ${department}</p>` : ''}
        ${rollNumber ? `<p>🎓 <strong>Roll No:</strong> ${rollNumber}</p>` : ''}
      </div>
      <div class="warning">
        <p><strong>⚠️ Important:</strong></p>
        <p>• This is a temporary password that expires in 48 hours</p>
        <p>• You will be required to change it on first login</p>
        <p>• Never share your password with anyone</p>
      </div>
      <a href="${loginUrl}" class="button">Login to ALMTS →</a>
    `;
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '🎓 Welcome to ALMTS — Your Account is Ready!',
      html: emailTemplate(content)
    });
    
    console.log(`✅ Welcome email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.log('Email send failed:', error.message);
    return { success: false, error: error.message };
  }
};

const sendPasswordResetEmail = async (userData) => {
  if (!transporter) return { success: false, error: 'Email service not configured' };
  
  try {
    const { name, email, tempPassword, resetBy, loginUrl } = userData;
    
    const content = `
      <h2>Password Reset 🔑</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your password has been reset by an administrator (${resetBy}).</p>
      <div class="credentials">
        <p>🔑 <strong>New Password:</strong> ${tempPassword}</p>
      </div>
      <div class="warning">
        <p><strong>⚠️ Important:</strong> This password expires in 48 hours.</p>
        <p>If you did not request this reset, contact your administrator immediately.</p>
      </div>
      <a href="${loginUrl}" class="button">Login to ALMTS →</a>
    `;
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '🔑 ALMTS — Your Password Has Been Reset',
      html: emailTemplate(content)
    });
    
    console.log(`✅ Password reset email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.log('Email send failed:', error.message);
    return { success: false, error: error.message };
  }
};

const sendAccountDeactivatedEmail = async (userData) => {
  if (!transporter) return { success: false, error: 'Email service not configured' };
  
  try {
    const { name, email, deactivatedBy, reason } = userData;
    
    const content = `
      <h2>Account Deactivated ⚠️</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your ALMTS account has been deactivated by ${deactivatedBy}.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please contact your administrator for more information or to request reactivation.</p>
    `;
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '⚠️ ALMTS — Your Account Has Been Deactivated',
      html: emailTemplate(content)
    });
    
    console.log(`✅ Deactivation email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.log('Email send failed:', error.message);
    return { success: false, error: error.message };
  }
};

const sendAccountReactivatedEmail = async (userData) => {
  if (!transporter) return { success: false, error: 'Email service not configured' };
  
  try {
    const { name, email, loginUrl } = userData;
    
    const content = `
      <h2>Account Reactivated ✅</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Good news! Your ALMTS account has been reactivated.</p>
      <p>You can now log in and access all features.</p>
      <a href="${loginUrl}" class="button">Login to ALMTS →</a>
    `;
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '✅ ALMTS — Your Account Has Been Reactivated',
      html: emailTemplate(content)
    });
    
    console.log(`✅ Reactivation email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.log('Email send failed:', error.message);
    return { success: false, error: error.message };
  }
};

const sendMeetingInviteEmail = async (user, meeting) => {
  if (!transporter) return { success: false, error: 'Email service not configured' };
  
  try {
    const content = `
      <h2>Meeting Invitation</h2>
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>You have been invited to a meeting:</p>
      <div class="credentials">
        <p><strong>Title:</strong> ${meeting.title}</p>
        <p><strong>Date & Time:</strong> ${new Date(meeting.scheduledAt).toLocaleString()}</p>
        <p><strong>Duration:</strong> ${meeting.duration} minutes</p>
        ${meeting.isOnline ? `<p><strong>Meeting Link:</strong> <a href="${meeting.meetingLink}">${meeting.meetingLink}</a></p>` : `<p><strong>Location:</strong> ${meeting.location}</p>`}
      </div>
    `;
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: `Meeting Invitation: ${meeting.title}`,
      html: emailTemplate(content)
    });
    
    console.log(`✅ Meeting invite sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.log('Email send failed:', error.message);
    return { success: false, error: error.message };
  }
};

const sendAssignmentNotificationEmail = async (user, assignment) => {
  if (!transporter) return { success: false, error: 'Email service not configured' };
  
  try {
    const content = `
      <h2>New Assignment</h2>
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>A new assignment has been posted:</p>
      <div class="credentials">
        <p><strong>Title:</strong> ${assignment.title}</p>
        <p><strong>Subject:</strong> ${assignment.subject}</p>
        <p><strong>Due Date:</strong> ${new Date(assignment.dueDate).toLocaleDateString()}</p>
        <p><strong>Max Marks:</strong> ${assignment.maxMarks}</p>
      </div>
      <a href="${process.env.FRONTEND_URL}/student/dashboard" class="button">View Assignment</a>
    `;
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: `New Assignment: ${assignment.title}`,
      html: emailTemplate(content)
    });
    
    console.log(`✅ Assignment notification sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.log('Email send failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAccountDeactivatedEmail,
  sendAccountReactivatedEmail,
  sendMeetingInviteEmail,
  sendAssignmentNotificationEmail
};
