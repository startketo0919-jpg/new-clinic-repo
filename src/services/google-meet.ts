import { google } from 'googleapis';

export function getGoogleAuthUrl(clientId: string, redirectUri: string): string {
    const oauth2Client = new google.auth.OAuth2(clientId, '', redirectUri);
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email'
        ]
    });
}

export async function exchangeCodeForTokens(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiryDate: number; email: string }> {
    try {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        return {
            accessToken: tokens.access_token || '',
            refreshToken: tokens.refresh_token || '',
            expiryDate: tokens.expiry_date || 0,
            email: userInfo.data.email || ''
        };
    } catch (error) {
        console.error('[GoogleMeet] Error in exchangeCodeForTokens:', error);
        throw error;
    }
}

export async function refreshAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string
): Promise<{ accessToken: string; expiryDate: number }> {
    try {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const { credentials } = await oauth2Client.refreshAccessToken();

        return {
            accessToken: credentials.access_token || '',
            expiryDate: credentials.expiry_date || 0
        };
    } catch (error) {
        console.error('[GoogleMeet] Error in refreshAccessToken:', error);
        throw error;
    }
}

interface MeetEventParams {
    accessToken: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    appointmentId: string;
    patientName: string;
    doctorEmail: string;
    date: string;
    timeSlot: string;
    slotEnd: string;
    healthConcern: string;
}

export async function createMeetEvent(params: MeetEventParams): Promise<{ meetLink: string; eventId: string }> {
    try {
        const oauth2Client = new google.auth.OAuth2(params.clientId, params.clientSecret);
        oauth2Client.setCredentials({
            access_token: params.accessToken,
            refresh_token: params.refreshToken
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const event = {
            summary: `Online Consultation - ${params.patientName}`,
            description: `Krishna Homoeopathic Clinic - Online Video Consultation\nAppointment ID: ${params.appointmentId}\nHealth Concern: ${params.healthConcern}`,
            start: {
                dateTime: `${params.date}T${params.timeSlot}:00`,
                timeZone: 'Asia/Kolkata'
            },
            end: {
                dateTime: `${params.date}T${params.slotEnd}:00`,
                timeZone: 'Asia/Kolkata'
            },
            conferenceData: {
                createRequest: {
                    requestId: params.appointmentId,
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            }
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1
        });

        return {
            meetLink: response.data.hangoutLink || '',
            eventId: response.data.id || ''
        };
    } catch (error) {
        console.error('[GoogleMeet] Error in createMeetEvent:', error);
        throw error;
    }
}

export async function deleteMeetEvent(params: {
    accessToken: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    doctorEmail: string;
    eventId: string;
}): Promise<void> {
    try {
        const oauth2Client = new google.auth.OAuth2(params.clientId, params.clientSecret);
        oauth2Client.setCredentials({
            access_token: params.accessToken,
            refresh_token: params.refreshToken
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: params.eventId
        });
    } catch (error) {
        console.error('[GoogleMeet] Error in deleteMeetEvent:', error);
        throw error;
    }
}

export async function updateMeetEvent(params: MeetEventParams & { eventId: string }): Promise<{ meetLink: string; eventId: string }> {
    try {
        const oauth2Client = new google.auth.OAuth2(params.clientId, params.clientSecret);
        oauth2Client.setCredentials({
            access_token: params.accessToken,
            refresh_token: params.refreshToken
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const event = {
            summary: `Online Consultation - ${params.patientName}`,
            description: `Krishna Homoeopathic Clinic - Online Video Consultation\nAppointment ID: ${params.appointmentId}\nHealth Concern: ${params.healthConcern}`,
            start: {
                dateTime: `${params.date}T${params.timeSlot}:00`,
                timeZone: 'Asia/Kolkata'
            },
            end: {
                dateTime: `${params.date}T${params.slotEnd}:00`,
                timeZone: 'Asia/Kolkata'
            },
            conferenceData: {
                createRequest: {
                    requestId: params.appointmentId,
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            }
        };

        const response = await calendar.events.patch({
            calendarId: 'primary',
            eventId: params.eventId,
            requestBody: event,
            conferenceDataVersion: 1
        });

        return {
            meetLink: response.data.hangoutLink || '',
            eventId: response.data.id || ''
        };
    } catch (error) {
        console.error('[GoogleMeet] Error in updateMeetEvent:', error);
        throw error;
    }
}
