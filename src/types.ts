export type Priority = 'Normal' | 'Senior Citizen' | 'Emergency';
export type VisitType = 'New' | 'Follow-up' | 'Report Review';
export type PatientStatus = 'Waiting' | 'In Room' | 'Completed' | 'Skipped';

export interface PatientRecord {
  clinicId: string;
  fullName: string;
  phone: string;
  email?: string;
  age: number;
  gender: string;
  firstVisit: number;
  lastVisited?: number;
  followUpDate?: number;
}

export interface Patient {
  id: string;
  clinicId: string;
  token: string;
  fullName: string;
  phone: string;
  email?: string;
  age: number;
  gender: string;
  priority: Priority;
  visitType: VisitType;
  shiftPreference?: string;
  status: PatientStatus;
  checkInTime: number; // timestamp
  waitElapsed: number; // in minutes (derived or stored)
  completedTime?: number;
}

export type Role = 'admin' | 'staff' | 'doctor';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  email?: string;
}

export interface Appointment {
  id: string;
  clinicId?: string;
  fullName: string;
  phone: string;
  email?: string;
  age: number;
  gender: string;
  visitType: VisitType;
  shiftPreference?: string;
  date: string;
}

export interface PatientShipment {
  id: string;
  patientName: string;
  phone: string;
  email?: string;
  address: string;
  pincode: string;
  notes?: string;
  status: 'Pending' | 'Completed';
  createdAt: number;
  completedAt?: number;
}

export interface ClinicState {
  patients: Patient[];
  patientRegistry: PatientRecord[];
  users: User[];
  currentPatientId: string | null;
  appointments: Appointment[];
  shipments: PatientShipment[];
  messages: WhatsAppMessage[];
  settings: {
    whatsappApiKey: string;
    whatsappPhoneId: string;
    waAutoRegisterSameDay: boolean;
    waAutoRegisterFuture: boolean;
    waAutoQueueAlert: boolean;
    waAutoFollowUp: boolean;
    smtpHost?: string;
    smtpPort?: string;
    smtpUser?: string;
    smtpPass?: string;
    emailAutoNewPid?: boolean;
    emailAutoApptConfirmed?: boolean;
    emailAutoNextInQueue?: boolean;
    emailAutoFollowUp?: boolean;
    emailAutoCheckIn?: boolean;
    delhiveryApiKey?: string;
    delhiveryWarehouses?: string;
    razorpayKeyId?: string;
    razorpayKeySecret?: string;
    consultationFee?: number;
    googleOauthClientId?: string;
    googleOauthClientSecret?: string;
    googleOauthRefreshToken?: string;
    googleOauthAccessToken?: string;
    googleOauthTokenExpiry?: string;
    googleCalendarEmail?: string;
    notificationEmails?: string;
    followUpFreeDays?: number;
  };
  templates: WhatsAppTemplate[];
}

export interface WhatsAppMessage {
  id: string;
  phone: string;
  direction: 'inbound' | 'outbound';
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'received';
  timestamp: number;
}


export interface WhatsAppTemplate {
  id: string;
  name: string;
  triggerEvent: string;
  languageCode: string;
  variables: string; // JSON string
  isActive: boolean;
}
