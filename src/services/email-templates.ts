export function buildAppointmentConfirmationEmail(data: { patientName: string, appointmentId: string, clinicId?: string, date: string, timeSlot: string, healthConcern: string, paymentAmount: number, paymentRef: string, meetLink: string, rescheduleUrl: string }): string {
    const feeText = data.paymentAmount === 0 ? 'FREE (Follow-up)' : `₹${(data.paymentAmount / 100).toFixed(2)} (Paid • Ref: ${data.paymentRef})`;
    const patientIdText = data.clinicId ? `<p style="margin-bottom: 20px;">Your Patient ID: <strong>${data.clinicId}</strong></p>` : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #475569;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background-color: #2d3b2d; color: #ffffff; padding: 30px 20px; text-align: center;">
            <h2 style="margin: 0 0 5px 0; font-size: 24px; font-weight: 600;">Dr. Sunil Kumar (BHMS)</h2>
            <p style="margin: 0; font-size: 14px; letter-spacing: 1px; opacity: 0.9;">KRISHNA HOMOEOPATHIC CLINIC &bull; FOUNDED 2005</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 25px;">
                <span style="background-color: #e6f4ea; color: #1e4620; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                    &check; Appointment Confirmed (ID: ${data.appointmentId})
                </span>
            </div>
            
            <p style="font-size: 16px;">Hello <strong>${data.patientName}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Thank you for scheduling your consultation with Dr. Sunil Kumar. Your session has been officially registered in our clinical calendar.</p>
            
            ${patientIdText}

            <!-- Details Card -->
            <div style="border: 2px dashed #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px; background-color: #fafafa;">
                <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 15px;">
                    <tr><td width="35%" style="color: #64748b;">Consultation Type:</td><td><strong>Live Video Consultation (India Only)</strong></td></tr>
                    <tr><td style="color: #64748b;">Date & Time:</td><td><strong>${data.date} at ${data.timeSlot}</strong></td></tr>
                    <tr><td style="color: #64748b;">Health Concern:</td><td><strong>${data.healthConcern}</strong></td></tr>
                    <tr><td style="color: #64748b;">Consultation Fee:</td><td><strong>${feeText}</strong></td></tr>
                </table>
            </div>

            <!-- Meet Card -->
            <div style="border: 2px dashed #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 30px; text-align: center; background-color: #fafafa;">
                <h3 style="margin-top: 0; margin-bottom: 20px; color: #1e293b; font-size: 16px; letter-spacing: 0.5px;">YOUR VIDEO CONSULTATION ROOM</h3>
                <a href="${data.meetLink}" style="display: inline-block; background-color: #2d3b2d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-bottom: 15px;">Join Google Meet Consultation</a>
                <p style="margin: 0; font-size: 14px; color: #64748b; word-break: break-all;">Link: <a href="${data.meetLink}" style="color: #2563eb;">${data.meetLink}</a></p>
            </div>

            <p style="font-size: 15px; margin-bottom: 15px;">Need to change your time? You can reschedule free of charge up to 1 hour prior:</p>
            <a href="${data.rescheduleUrl}" style="display: inline-block; background-color: #f1f5f9; color: #334155; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; font-size: 15px; border: 1px solid #cbd5e1;">&#128197; Reschedule My Appointment</a>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 13px; line-height: 1.6;">
            <p style="margin: 0 0 5px 0;">Krishna Homoeopathic Clinic &bull; +91 94562 18066 &bull; contact@drsunilkumarbhms.in</p>
            <p style="margin: 0;">15-Day Free Follow-Up Window applies to all registered consultations.</p>
        </div>
    </div>
</body>
</html>
    `;
}

export function buildAppointmentRescheduleEmail(data: { patientName: string, appointmentId: string, newDate: string, newTimeSlot: string, healthConcern: string, meetLink: string, rescheduleUrl: string }): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #475569;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background-color: #2d3b2d; color: #ffffff; padding: 30px 20px; text-align: center;">
            <h2 style="margin: 0 0 5px 0; font-size: 24px; font-weight: 600;">Dr. Sunil Kumar (BHMS)</h2>
            <p style="margin: 0; font-size: 14px; letter-spacing: 1px; opacity: 0.9;">KRISHNA HOMOEOPATHIC CLINIC &bull; FOUNDED 2005</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 25px;">
                <span style="background-color: #e0f2fe; color: #0284c7; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                    &#128260; Appointment Rescheduled (ID: ${data.appointmentId})
                </span>
            </div>
            
            <p style="font-size: 16px;">Hello <strong>${data.patientName}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Your appointment has been successfully rescheduled.</p>
            
            <!-- Details Card -->
            <div style="border: 2px dashed #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px; background-color: #fafafa;">
                <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 15px;">
                    <tr><td width="35%" style="color: #64748b;">New Date & Time:</td><td><strong>${data.newDate} at ${data.newTimeSlot}</strong></td></tr>
                    <tr><td style="color: #64748b;">Health Concern:</td><td><strong>${data.healthConcern}</strong></td></tr>
                </table>
            </div>

            <!-- Meet Card -->
            <div style="border: 2px dashed #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 30px; text-align: center; background-color: #fafafa;">
                <h3 style="margin-top: 0; margin-bottom: 20px; color: #1e293b; font-size: 16px; letter-spacing: 0.5px;">YOUR VIDEO CONSULTATION ROOM</h3>
                <a href="${data.meetLink}" style="display: inline-block; background-color: #2d3b2d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-bottom: 15px;">Join Google Meet Consultation</a>
                <p style="margin: 0; font-size: 14px; color: #64748b; word-break: break-all;">Link: <a href="${data.meetLink}" style="color: #2563eb;">${data.meetLink}</a></p>
            </div>

            <p style="font-size: 15px; margin-bottom: 15px;">Need to change your time again? You can reschedule free of charge up to 1 hour prior:</p>
            <a href="${data.rescheduleUrl}" style="display: inline-block; background-color: #f1f5f9; color: #334155; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; font-size: 15px; border: 1px solid #cbd5e1;">&#128197; Reschedule My Appointment</a>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 13px; line-height: 1.6;">
            <p style="margin: 0 0 5px 0;">Krishna Homoeopathic Clinic &bull; +91 94562 18066 &bull; contact@drsunilkumarbhms.in</p>
            <p style="margin: 0;">15-Day Free Follow-Up Window applies to all registered consultations.</p>
        </div>
    </div>
</body>
</html>
    `;
}

export function buildStaffNotificationEmail(data: { patientName: string, phone: string, email: string, appointmentId: string, clinicId?: string, date: string, timeSlot: string, healthConcern: string, paymentAmount: number, paymentRef: string, patientType: string, fileLinks?: {name: string, url: string}[], courierInfo?: { address: string, pincode: string, contact: string } }): string {
    const feeText = data.paymentAmount === 0 ? 'FREE (Follow-up)' : `₹${(data.paymentAmount / 100).toFixed(2)} (Paid • Ref: ${data.paymentRef})`;
    
    let filesHtml = '';
    if (data.fileLinks && data.fileLinks.length > 0) {
        const linksHtml = data.fileLinks.map(f => `<li><a href="${f.url}" style="color: #2563eb;">${f.name}</a></li>`).join('');
        filesHtml = `
            <div style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #1e293b;">Uploaded Reports:</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    ${linksHtml}
                </ul>
            </div>
        `;
    }

    let courierHtml = '';
    if (data.courierInfo) {
        courierHtml = `
            <div style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background-color: #fffbeb;">
                <h4 style="margin: 0 0 10px 0; color: #b45309;">Medicine Delivery Requested:</h4>
                <p style="margin: 0 0 5px 0;"><strong>Address:</strong> ${data.courierInfo.address}</p>
                <p style="margin: 0 0 5px 0;"><strong>Pincode:</strong> ${data.courierInfo.pincode}</p>
                <p style="margin: 0;"><strong>Contact:</strong> ${data.courierInfo.contact}</p>
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #475569;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background-color: #2d3b2d; color: #ffffff; padding: 20px; text-align: center;">
            <h2 style="margin: 0 0 5px 0; font-size: 20px; font-weight: 600;">Dr. Sunil Kumar (BHMS)</h2>
            <p style="margin: 0; font-size: 12px; letter-spacing: 1px; opacity: 0.9;">KRISHNA HOMOEOPATHIC CLINIC &bull; FOUNDED 2005</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
            <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">New Online Appointment Booked</h3>
            
            <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <tr style="background-color: #f8fafc;"><th colspan="2" style="text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0;">Patient Details</th></tr>
                <tr><td width="30%" style="color: #64748b; border-bottom: 1px solid #f1f5f9;">Name:</td><td style="border-bottom: 1px solid #f1f5f9;"><strong>${data.patientName}</strong></td></tr>
                <tr><td style="color: #64748b; border-bottom: 1px solid #f1f5f9;">Phone:</td><td style="border-bottom: 1px solid #f1f5f9;">${data.phone}</td></tr>
                <tr><td style="color: #64748b; border-bottom: 1px solid #f1f5f9;">Email:</td><td style="border-bottom: 1px solid #f1f5f9;">${data.email}</td></tr>
                <tr><td style="color: #64748b; border-bottom: 1px solid #f1f5f9;">Patient ID:</td><td style="border-bottom: 1px solid #f1f5f9;">${data.clinicId || 'N/A (New)'}</td></tr>
                <tr><td style="color: #64748b;">Type:</td><td>${data.patientType}</td></tr>
            </table>

            <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px; border: 1px solid #e2e8f0;">
                <tr style="background-color: #f8fafc;"><th colspan="2" style="text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0;">Appointment Details</th></tr>
                <tr><td width="30%" style="color: #64748b; border-bottom: 1px solid #f1f5f9;">Date & Time:</td><td style="border-bottom: 1px solid #f1f5f9;"><strong>${data.date} at ${data.timeSlot}</strong></td></tr>
                <tr><td style="color: #64748b; border-bottom: 1px solid #f1f5f9;">Concern:</td><td style="border-bottom: 1px solid #f1f5f9;">${data.healthConcern}</td></tr>
                <tr><td style="color: #64748b; border-bottom: 1px solid #f1f5f9;">Appt ID:</td><td style="border-bottom: 1px solid #f1f5f9;">${data.appointmentId}</td></tr>
                <tr><td style="color: #64748b;">Payment:</td><td>${feeText}</td></tr>
            </table>

            ${filesHtml}
            ${courierHtml}
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
            System Notification - Krishna Homoeopathic Clinic
        </div>
    </div>
</body>
</html>
    `;
}

export function buildReminderEmail(data: { patientName: string, appointmentId: string, date: string, timeSlot: string, meetLink: string, hoursUntil: number, rescheduleUrl: string }): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #475569;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background-color: #2d3b2d; color: #ffffff; padding: 30px 20px; text-align: center;">
            <h2 style="margin: 0 0 5px 0; font-size: 24px; font-weight: 600;">Dr. Sunil Kumar (BHMS)</h2>
            <p style="margin: 0; font-size: 14px; letter-spacing: 1px; opacity: 0.9;">KRISHNA HOMOEOPATHIC CLINIC &bull; FOUNDED 2005</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 25px;">
                <span style="background-color: #fef08a; color: #854d0e; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                    &#9200; Appointment Reminder
                </span>
            </div>
            
            <p style="font-size: 16px;">Hello <strong>${data.patientName}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Your consultation is in <strong>${data.hoursUntil} hour(s)</strong>!</p>
            
            <!-- Details Card -->
            <div style="border: 2px dashed #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 30px; text-align: center; background-color: #fafafa;">
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #1e293b;"><strong>${data.date} at ${data.timeSlot}</strong></p>
                <a href="${data.meetLink}" style="display: inline-block; background-color: #2d3b2d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-bottom: 15px;">Join Google Meet Consultation</a>
            </div>

            <div style="text-align: center;">
                <a href="${data.rescheduleUrl}" style="display: inline-block; background-color: transparent; color: #64748b; text-decoration: underline; font-size: 14px;">Reschedule my appointment</a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 13px; line-height: 1.6;">
            <p style="margin: 0 0 5px 0;">Krishna Homoeopathic Clinic &bull; +91 94562 18066 &bull; contact@drsunilkumarbhms.in</p>
            <p style="margin: 0;">15-Day Free Follow-Up Window applies to all registered consultations.</p>
        </div>
    </div>
</body>
</html>
    `;
}

export function buildRefundEmail(data: { patientName: string, appointmentId: string, date: string, timeSlot: string, refundAmount: number, paymentRef: string }): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #475569;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background-color: #2d3b2d; color: #ffffff; padding: 30px 20px; text-align: center;">
            <h2 style="margin: 0 0 5px 0; font-size: 24px; font-weight: 600;">Dr. Sunil Kumar (BHMS)</h2>
            <p style="margin: 0; font-size: 14px; letter-spacing: 1px; opacity: 0.9;">KRISHNA HOMOEOPATHIC CLINIC &bull; FOUNDED 2005</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 25px;">
                <span style="background-color: #fee2e2; color: #b91c1c; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                    &#10060; Appointment Cancelled
                </span>
            </div>
            
            <p style="font-size: 16px;">Hello <strong>${data.patientName}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Your appointment has been cancelled and a refund of <strong>₹${(data.refundAmount / 100).toFixed(2)}</strong> has been initiated.</p>
            
            <!-- Details Card -->
            <div style="border: 2px dashed #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px; background-color: #fafafa;">
                <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 15px;">
                    <tr><td width="40%" style="color: #64748b;">Original Appointment:</td><td><strong>${data.date} at ${data.timeSlot}</strong></td></tr>
                    <tr><td style="color: #64748b;">Appointment ID:</td><td>${data.appointmentId}</td></tr>
                    <tr><td style="color: #64748b;">Refund Reference:</td><td>${data.paymentRef}</td></tr>
                </table>
            </div>

            <p style="font-size: 14px; color: #64748b;">Please allow 5-7 business days for the refund to reflect in your original payment method.</p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 13px; line-height: 1.6;">
            <p style="margin: 0 0 5px 0;">Krishna Homoeopathic Clinic &bull; +91 94562 18066 &bull; contact@drsunilkumarbhms.in</p>
            <p style="margin: 0;">15-Day Free Follow-Up Window applies to all registered consultations.</p>
        </div>
    </div>
</body>
</html>
    `;
}

export function buildRescheduleOtpEmail(data: { patientName: string, otp: string }): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #475569;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background-color: #2d3b2d; color: #ffffff; padding: 30px 20px; text-align: center;">
            <h2 style="margin: 0 0 5px 0; font-size: 24px; font-weight: 600;">Dr. Sunil Kumar (BHMS)</h2>
            <p style="margin: 0; font-size: 14px; letter-spacing: 1px; opacity: 0.9;">KRISHNA HOMOEOPATHIC CLINIC &bull; FOUNDED 2005</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
            <h3 style="margin-top: 0; color: #1e293b; text-align: center; font-size: 20px; margin-bottom: 25px;">Reschedule Verification Code</h3>
            
            <p style="font-size: 16px;">Hello <strong>${data.patientName}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 25px;">Your OTP for rescheduling your appointment is:</p>
            
            <div style="text-align: center; margin-bottom: 25px;">
                <span style="display: inline-block; background-color: #f1f5f9; color: #1e293b; padding: 15px 30px; border-radius: 8px; font-size: 32px; font-weight: 700; letter-spacing: 5px; border: 2px dashed #cbd5e1;">
                    ${data.otp}
                </span>
            </div>

            <p style="font-size: 15px; color: #ef4444; text-align: center; font-weight: 500;">This code expires in 10 minutes.</p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 13px; line-height: 1.6;">
            <p style="margin: 0 0 5px 0;">Krishna Homoeopathic Clinic &bull; +91 94562 18066 &bull; contact@drsunilkumarbhms.in</p>
            <p style="margin: 0;">15-Day Free Follow-Up Window applies to all registered consultations.</p>
        </div>
    </div>
</body>
</html>
    `;
}
