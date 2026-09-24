import React, { createContext, useContext, useEffect, useState } from 'react';
import { ClinicState, Patient, PatientRecord, PatientStatus, User, Appointment, WhatsAppTemplate } from '../types';

const INITIAL_REGISTRY: PatientRecord[] = [];
const INITIAL_DATA: Patient[] = [];
const INITIAL_SETTINGS = { 
    whatsappApiKey: '', 
    whatsappPhoneId: '',
    waAutoRegisterSameDay: true,
    waAutoRegisterFuture: true,
    waAutoQueueAlert: true,
    waAutoFollowUp: true
  };
const INITIAL_USERS: User[] = [
  { id: '1', username: 'suyash', passwordHash: '', role: 'admin', email: 'skgservicesin@gmail.com' },
];

interface ClinicContextType {
  state: ClinicState;
  addPatient: (patient: Omit<Patient, 'id' | 'clinicId' | 'token' | 'status' | 'checkInTime' | 'waitElapsed'>, explicitClinicId?: string, visitDateStr?: string, source?: 'staff' | 'self') => void;
  updatePatientStatus: (id: string, status: PatientStatus) => void;
  reorderWaitingQueue: (newOrder: Patient[]) => void;
  deletePatientRecord: (clinicId: string) => void;
  updateFollowUpDate: (clinicId: string, date: number) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  deleteUser: (id: string) => void;
  updateUserEmail: (id: string, email: string) => void;
  updateUserPassword: (username: string, newPassword: string) => void;
  addAppointment: (app: Omit<Appointment, 'id' | 'clinicId'>, explicitClinicId?: string, source?: 'staff' | 'self') => string;
  cancelAppointment: (id: string) => void;
  approveAppointment: (app: Appointment) => void;
  updateSettings: (settings: Partial<ClinicState['settings']>) => void;
  updateTemplates: (templates: WhatsAppTemplate[]) => Promise<void>;
  sendWhatsAppMessage: (phone: string, content: string, templateName?: string, templateLanguage?: string, templateComponents?: any[]) => Promise<void>;
  resetDatabase: (adminPass: string) => Promise<{ success: boolean; error?: string }>;
  markShipmentStatus: (id: string, status: 'Pending' | 'Completed') => Promise<void>;
  deleteShipment: (id: string) => Promise<void>;
  nextSequence: number;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ClinicState>({
    patients: INITIAL_DATA,
    patientRegistry: INITIAL_REGISTRY,
    users: INITIAL_USERS,
    appointments: [],
    shipments: [],
    messages: [],
    templates: [],
    settings: INITIAL_SETTINGS,
    currentPatientId: null,
  });

  const [nextSequence, setNextSequence] = useState(1);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setState(prev => ({
          ...prev,
          patients: data.patients || [],
          patientRegistry: data.patientRegistry || [],
          appointments: data.appointments || [],
          shipments: data.shipments || [],
          messages: data.messages || [],
          users: data.users && data.users.length > 0 ? data.users : INITIAL_USERS,
          settings: data.settings || INITIAL_SETTINGS,
          templates: data.templates || [],
          currentPatientId: data.settings?.currentPatientId || null,
        }));
        setNextSequence(data.settings?.nextSequence || 1);
      }
    } catch (e) {
      console.error("Failed to fetch remote state", e);
    }
  };

  useEffect(() => {
    fetchState();
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      if (event.data === 'update') {
        fetchState();
      }
    };
    return () => eventSource.close();
  }, []);

  const dispatchAction = async (type: string, payload: any) => {
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          console.warn(`[Security Notice] Action ${type} rejected by server: ${data.error || res.statusText}`);
        }
      }
      // SSE will trigger re-fetch on all connected clients including this one
    } catch (e) {
      console.error(`Failed to dispatch ${type}`, e);
    }
  };

  const addPatient = (data: Omit<Patient, 'id' | 'clinicId' | 'token' | 'status' | 'checkInTime' | 'waitElapsed'>, explicitClinicId?: string, visitDateStr?: string, source: 'staff' | 'self' = 'staff') => {
    const token = `A-${String(nextSequence).padStart(3, '0')}`;
    const checkInTime = visitDateStr ? new Date(visitDateStr).getTime() : Date.now();
    let clinicId = explicitClinicId || '';
    let newRecord = null;
    
    if (!clinicId) {
      const existingRecord = state.patientRegistry.find(r => r.phone === data.phone && r.fullName.toLowerCase() === data.fullName.toLowerCase());
      if (existingRecord) {
        clinicId = existingRecord.clinicId;
      } else {
        const maxPid = state.patientRegistry.reduce((max, r) => {
          const num = parseInt(r.clinicId.replace('PID-', '')) || 0;
          return num > max ? num : max;
        }, 0);
        clinicId = `PID-${String(maxPid + 1).padStart(4, '0')}`;
        newRecord = {
          clinicId,
          fullName: data.fullName,
          phone: data.phone,
          email: data.email,
          age: data.age,
          gender: data.gender,
          firstVisit: checkInTime,
          lastVisited: checkInTime
        };
      }
    }

    const newPatient = { ...data, id: crypto.randomUUID(), clinicId, token, status: 'Waiting' as PatientStatus, checkInTime, waitElapsed: 0 };
    
    // Optimistic UI update
    setState(prev => {
      const newReg = newRecord ? [...prev.patientRegistry, newRecord] : prev.patientRegistry;
      return { ...prev, patients: [...prev.patients, newPatient], patientRegistry: newReg };
    });
    setNextSequence(s => s + 1);
    dispatchAction('ADD_PATIENT', { patient: newPatient, newRecord });
    
    // Trigger templates
    const dateStr = new Date(checkInTime).toLocaleDateString();
    
    // Legacy generic events
    triggerTemplateEvent('new_patient', { ...newPatient, dateStr });
    
    if (newPatient.email || newRecord?.email) {
      const pEmail = newPatient.email || newRecord?.email;
      if (state.settings.emailAutoCheckIn !== false) {
        sendStyledEmail(pEmail, {
          subject: 'You are in the queue! - Krishna Homoeopathic Clinic',
          title: 'Check-in Successful',
          heading: `Hey ${newPatient.fullName},`,
          body: `You have successfully checked in to Krishna Homoeopathic Clinic. Your token number is:`,
          highlight: `Token: ${newPatient.token}`,
          footer: [
            { title: 'Track your status', desc: 'Keep an eye on the waiting room monitor or tracker.' }
          ]
        });
      }

      if (newRecord && state.settings.emailAutoNewPid !== false) {
        sendStyledEmail(pEmail, {
          subject: 'Welcome to Krishna Homoeopathic Clinic - Your Registration Details',
          title: 'Registration Successful',
          heading: `Hey ${newPatient.fullName},`,
          body: `Your patient profile has been successfully created. Here are your registration details:<br/><br/>
                 <b>Patient Name:</b> ${newPatient.fullName}<br/>
                 <b>Age:</b> ${newPatient.age} yrs<br/>
                 <b>Date of Registration:</b> ${dateStr}<br/>
                 Keep your PID safe, you can use it for quick check-ins in the future.`,
          highlight: `PID: ${newPatient.clinicId}`,
          footer: [
            { title: 'Thank you for choosing us', desc: 'Krishna Homoeopathic Clinic' }
          ]
        });
      }
    }
    
    if (newRecord) {
      triggerTemplateEvent('pid_generated', { ...newPatient, dateStr });
    }
    
    // Source-specific events
    if (newRecord) {
      if (source === 'self') {
        triggerTemplateEvent('pid_generated_self', { ...newPatient, dateStr });
        triggerTemplateEvent('queue_new_self', { ...newPatient, dateStr });
      } else {
        triggerTemplateEvent('pid_generated_staff', { ...newPatient, dateStr });
        triggerTemplateEvent('queue_new_staff', { ...newPatient, dateStr });
      }
    } else {
      if (source === 'self') {
        triggerTemplateEvent('queue_old_self', { ...newPatient, dateStr });
      } else {
        triggerTemplateEvent('queue_old_staff', { ...newPatient, dateStr });
      }
    }
    
    return clinicId;
  };

  const updatePatientStatus = (id: string, status: PatientStatus) => {
    const patient = state.patients.find(p => p.id === id);
    if (!patient) return;

    if (patient.email) {
      if (status === 'In Room') {
        sendStyledEmail(patient.email, {
          subject: 'It is your turn! - Krishna Homoeopathic Clinic',
          title: 'Doctor is ready',
          heading: `Hey ${patient.fullName},`,
          body: 'The doctor is ready to see you now. Please proceed to the consultation room.',
          highlight: 'Status: In Room',
          footer: [{ title: 'Thank you for your patience', desc: '' }]
        });
      } else if (status === 'Completed') {
        sendStyledEmail(patient.email, {
          subject: 'Thank you for visiting Krishna Homoeopathic Clinic',
          title: 'Consultation Completed',
          heading: `Hey ${patient.fullName},`,
          body: 'Your consultation has been marked as completed. We hope you feel better soon!',
          footer: [{ title: 'Need further assistance?', desc: 'Please contact the reception.' }]
        });
      }
    }

    // If someone goes In Room, notify the NEXT person in line.
    if (status === 'In Room') {
       const waitingPatients = state.patients
          .filter(p => p.status === 'Waiting' && p.id !== id && new Date(p.checkInTime).toDateString() === new Date().toDateString())
          .sort((a, b) => a.checkInTime - b.checkInTime);
       
       if (waitingPatients.length > 0) {
          const nextPatient = waitingPatients[0];
          if (nextPatient.email && state.settings.emailAutoNextInQueue !== false) {
             sendStyledEmail(nextPatient.email, {
               subject: 'You are next! - Krishna Homoeopathic Clinic',
               title: 'Next in Queue',
               heading: `Hey ${nextPatient.fullName},`,
               body: 'You are next in the queue. The doctor will see you shortly. Please be ready.',
               highlight: `Token: ${nextPatient.token}`,
               footer: [{ title: 'Current Status', desc: 'Next in queue' }]
             });
          }
       }
    }

    setState(prev => {
      let newCurrentId = prev.currentPatientId;
      if (status === 'In Room') {
        newCurrentId = id;
      } else if (prev.currentPatientId === id) {
        newCurrentId = null;
      }
      
      const targetPatient = prev.patients.find(p => p.id === id);
      let updatedRegistry = prev.patientRegistry;
      
      if (status === 'Completed' && targetPatient) {
        updatedRegistry = prev.patientRegistry.map(r => 
          r.clinicId === targetPatient.clinicId 
            ? { ...r, lastVisited: Date.now() }
            : r
        );
      }
      
      return {
        ...prev,
        patients: prev.patients.map(p => p.id === id ? { ...p, status, completedTime: (status === 'Completed' || status === 'Skipped') ? Date.now() : p.completedTime } : p),
        patientRegistry: updatedRegistry,
        currentPatientId: newCurrentId
      };
    });
    
    dispatchAction('UPDATE_STATUS', { id, status });
    
    if (status === 'In Room') {
      dispatchAction('UPDATE_CURRENT', { id });
      
      // Find the next patient in line (first patient who is Waiting)
      // Find the next patient in line (first patient who is Waiting today)
      const today = new Date();
      const nextPatient = state.patients.find(p => {
        if (p.id === id || p.status !== 'Waiting') return false;
        const checkInDate = new Date(p.checkInTime);
        return checkInDate.getDate() === today.getDate() && 
               checkInDate.getMonth() === today.getMonth() && 
               checkInDate.getFullYear() === today.getFullYear();
      });
      if (nextPatient) {
        triggerTemplateEvent('next_in_queue', nextPatient);
      }
    } else if (status === 'Completed' || status === 'Skipped') {
      dispatchAction('UPDATE_CURRENT', { id: null });
    }
  };

  const reorderWaitingQueue = (newWaitingOrder: Patient[]) => {
    setState(prev => {
      const nonWaiting = prev.patients.filter(p => p.status !== 'Waiting');
      return { ...prev, patients: [...nonWaiting, ...newWaitingOrder] };
    });
    // Send only the array of IDs in their new order
    dispatchAction('REORDER_QUEUE', { newOrderIds: newWaitingOrder.map(p => p.id) });
  };

  const deletePatientRecord = (clinicId: string) => {
    setState(prev => ({
      ...prev,
      patientRegistry: prev.patientRegistry.filter(r => r.clinicId !== clinicId),
      patients: prev.patients.filter(p => p.clinicId !== clinicId)
    }));
    dispatchAction('DELETE_PATIENT_RECORD', { clinicId });
  };

  const updateFollowUpDate = (clinicId: string, date: number) => {
    setState(prev => ({
      ...prev,
      patientRegistry: prev.patientRegistry.map(r => r.clinicId === clinicId ? { ...r, followUpDate: date } : r)
    }));
    dispatchAction('UPDATE_FOLLOW_UP', { clinicId, date });
    
    // Auto-alert for follow up
    const patient = state.patientRegistry.find(p => p.clinicId === clinicId);
    if (patient) {
      const dateStr = new Date(date).toLocaleDateString();
      triggerTemplateEvent('follow_up', { ...patient, dateStr });
      if (patient.email && state.settings.emailAutoFollowUp !== false) {
        sendStyledEmail(patient.email, {
          subject: 'Follow-up Scheduled - Krishna Homoeopathic Clinic',
          title: 'Follow-up Appointment',
          heading: `Hey ${patient.fullName},`,
          body: `Your follow-up has been scheduled for ${dateStr}. Please make sure to visit us on the specified date.`,
          highlight: `Date: ${dateStr}`,
          footer: [{ title: 'Stay Healthy', desc: 'Krishna Homoeopathic Clinic' }]
        });
      }
    }
  };

  const addUser = (user: Omit<User, 'id'>) => {
    const newUser = { ...user, id: crypto.randomUUID() };
    setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
    dispatchAction('ADD_USER', newUser);
  };

  
  const updateUserEmail = (id: string, email: string) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === id ? { ...u, email } : u)
    }));
    dispatchAction('UPDATE_USER_EMAIL', { id, email });
  };

  const deleteUser = (id: string) => {
    let preventDelete = false;
    setState(prev => {
      const userToDelete = prev.users.find(u => u.id === id);
      if (userToDelete?.username === 'suyash' || userToDelete?.role === 'admin') {
        preventDelete = true;
        return prev;
      }
      return { ...prev, users: prev.users.filter(u => u.id !== id) };
    });
    
    if (!preventDelete) {
      dispatchAction('DELETE_USER', { id });
    }
  };

  const updateUserPassword = (username: string, newPassword: string) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.username === username ? { ...u, passwordHash: newPassword } : u)
    }));
    dispatchAction('UPDATE_USER_PASSWORD', { username, newPassword });
  };

  const addAppointment = (data: Omit<Appointment, 'id' | 'clinicId'>, explicitClinicId?: string, source: 'staff' | 'self' = 'staff') => {
    let clinicId = explicitClinicId || '';
    let newRecord = null;
    
    if (!clinicId) {
      const existingRecord = state.patientRegistry.find(r => r.phone === data.phone && r.fullName.toLowerCase() === data.fullName.toLowerCase());
      if (existingRecord) {
        clinicId = existingRecord.clinicId;
      } else {
        const maxPid = state.patientRegistry.reduce((max, r) => {
          const num = parseInt(r.clinicId.replace('PID-', '')) || 0;
          return num > max ? num : max;
        }, 0);
        clinicId = `PID-${String(maxPid + 1).padStart(4, '0')}`;
        newRecord = {
          clinicId,
          fullName: data.fullName,
          phone: data.phone,
          email: data.email,
          age: data.age,
          gender: data.gender,
          firstVisit: Date.now(),
          lastVisited: Date.now()
        };
      }
    }

    const app = { ...data, id: crypto.randomUUID(), clinicId };
    
    setState(prev => {
      const newReg = newRecord ? [...prev.patientRegistry, newRecord] : prev.patientRegistry;
      return { ...prev, appointments: [...prev.appointments, app], patientRegistry: newReg };
    });
    
    dispatchAction('ADD_APPOINTMENT', { appointment: app, newRecord });
    
    const dateStr = new Date(app.date).toLocaleDateString();
    
    // Legacy event
    triggerTemplateEvent('appointment_scheduled', { ...app, dateStr });

    if (app.email && state.settings.emailAutoApptConfirmed !== false) {
      sendStyledEmail(app.email, {
        subject: 'Appointment Scheduled - Krishna Homoeopathic Clinic',
        title: 'Appointment Confirmed',
        heading: `Hey ${app.fullName},`,
        body: `Your appointment has been successfully scheduled for ${dateStr}.`,
        highlight: dateStr,
        footer: []
      });
    }
    
    // Self check-in events
    if (newRecord) {
      if (app.email && state.settings.emailAutoNewPid !== false) {
        sendStyledEmail(app.email, {
          subject: 'Welcome to Krishna Homoeopathic Clinic - Your Registration Details',
          title: 'Registration Successful',
          heading: `Hey ${app.fullName},`,
          body: `Your patient profile has been successfully created. Here are your registration details:<br/><br/>
                 <b>Patient Name:</b> ${app.fullName}<br/>
                 <b>Age:</b> ${app.age} yrs<br/>
                 <b>Date of Registration:</b> ${dateStr}<br/>
                 Keep your PID safe, you can use it for quick check-ins in the future.`,
          highlight: `PID: ${app.clinicId}`,
          footer: [
            { title: 'Thank you for choosing us', desc: 'Krishna Homoeopathic Clinic' }
          ]
        });
      }
      triggerTemplateEvent('pid_generated', { ...app, dateStr }); // Generic
      if (source === 'self') {
        triggerTemplateEvent('pid_generated_self', { ...app, dateStr });
        triggerTemplateEvent('queue_new_self', { ...app, dateStr });
      } else {
        triggerTemplateEvent('pid_generated_staff', { ...app, dateStr });
        triggerTemplateEvent('queue_new_staff', { ...app, dateStr });
      }
    } else {
      if (source === 'self') {
        triggerTemplateEvent('queue_old_self', { ...app, dateStr });
      } else {
        triggerTemplateEvent('queue_old_staff', { ...app, dateStr });
      }
    }
    
    return clinicId;
  };

    const approveAppointment = (app: Appointment) => {
    addPatient({
      fullName: app.fullName,
      phone: app.phone,
      age: app.age,
      gender: app.gender,
      priority: 'Normal',
      visitType: app.visitType,
      shiftPreference: app.shiftPreference || 'Morning'
    }, app.clinicId, app.date, 'staff');
    
    cancelAppointment(app.id);
    
    const dateStr = new Date(app.date).toLocaleDateString();
    triggerTemplateEvent('appointment_approved', { ...app, dateStr });

    if (app.email && state.settings.emailAutoApptConfirmed !== false) {
      sendStyledEmail(app.email, {
        subject: 'Appointment Approved - Krishna Homoeopathic Clinic',
        title: 'Appointment Approved',
        heading: `Hey ${app.fullName},`,
        body: `Your appointment for ${dateStr} has been approved and you have been added to the queue for that day.`,
        highlight: dateStr,
        footer: []
      });
    }
  };

  const cancelAppointment = (id: string) => {
    setState(prev => ({ ...prev, appointments: prev.appointments.filter(a => a.id !== id) }));
    dispatchAction('CANCEL_APPOINTMENT', { id });
  };

  
  
  const sendStyledEmail = async (email: string, payload: any) => {
    if(!email) return;
    try {
      await fetch('/api/send-styled-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...payload })
      });
    } catch(err) {
      console.error('Failed to send email notification:', err);
    }
  };

  const sendWhatsAppMessage = async (phone: string, content: string, templateName?: string, templateLanguage?: string, templateComponents?: any[]) => {
    // Optimistic UI update
    const tempId = Date.now().toString();
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, {
        id: tempId,
        phone,
        direction: 'outbound',
        content,
        status: 'sent',
        timestamp: Date.now()
      }]
    }));
    await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, content, templateName, templateLanguage, templateComponents })
    });
    // the state will be re-fetched by the polling loop
  };

  
  const updateTemplates = async (templates: WhatsAppTemplate[]) => {
    setState(prev => ({ ...prev, templates }));
    await fetch('/api/whatsapp/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates })
    });
  };

  
  const triggerTemplateEvent = (eventName: string, data: any) => {
    const activeTemplate = state.templates?.find(t => t.triggerEvent === eventName && t.isActive);
    if (!activeTemplate) return;

    let varKeys = [];
    try {
      varKeys = JSON.parse(activeTemplate.variables);
    } catch(e) {}

    const components = varKeys.length > 0 ? [{
      type: "body",
      parameters: varKeys.map((k: string) => {
        let val = '';
        if (k === 'Name') val = data.fullName || '';
        if (k === 'Patient ID') val = data.clinicId || '';
        if (k === 'Token Number') val = data.token || '';
        if (k === 'Age') val = (data.age || '').toString();
        if (k === 'Date') val = data.dateStr || '';
        if (k === 'Wait Time') {
          // Calculate estimated wait time based on the live queue
          const todaysPatients = state.patients.filter(p => new Date(p.checkInTime).toLocaleDateString() === new Date().toLocaleDateString());
          const waitingPatients = todaysPatients.filter(p => p.status === 'Waiting');
          const position = waitingPatients.findIndex(p => p.id === data.id);
          
          if (position !== -1) {
            let estimated = 0;
            for (let i = 0; i < position; i++) {
              const vt = waitingPatients[i].visitType;
              if (vt === 'New') estimated += 10;
              else if (vt === 'Follow-up') estimated += 5;
              else if (vt === 'Report Review') estimated += 2;
              else estimated += 5;
            }
            const elapsed = Math.floor((Date.now() - data.checkInTime) / 60000);
            val = Math.max(0, estimated - elapsed).toString();
          } else {
            val = (data.waitElapsed || '').toString();
          }
        }
        return { type: "text", text: val };
      })
    }] : [];

    const fallbackText = `[Auto-Message for ${eventName}]`;
    
    sendWhatsAppMessage(
      data.phone,
      fallbackText,
      activeTemplate.name,
      activeTemplate.languageCode,
      components
    );
  };
  const updateSettings = (settings: Partial<ClinicState['settings']>) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }));
    dispatchAction('UPDATE_SETTINGS', settings);
  };

  const resetDatabase = async (adminPass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'RESET_DB',
          payload: { adminPass }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setState(prev => ({
          ...prev,
          patients: [],
          patientRegistry: [],
          appointments: [],
          messages: [],
          currentPatientId: null
        }));
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Incorrect Admin Password!' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection error' };
    }
  };

  const markShipmentStatus = async (id: string, status: 'Pending' | 'Completed') => {
    setState(prev => ({
      ...prev,
      shipments: prev.shipments.map(s => s.id === id ? { ...s, status, completedAt: status === 'Completed' ? Date.now() : undefined } : s)
    }));
    try {
      await fetch(`/api/shipments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (e) {
      console.error("Failed to update shipment status", e);
    }
  };

  const deleteShipment = async (id: string) => {
    setState(prev => ({
      ...prev,
      shipments: prev.shipments.filter(s => s.id !== id)
    }));
    try {
      await fetch(`/api/shipments/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error("Failed to delete shipment", e);
    }
  };

  return (
    <ClinicContext.Provider value={{ 
      state, addPatient, updatePatientStatus, reorderWaitingQueue, deletePatientRecord,
      updateFollowUpDate, addUser, deleteUser, updateUserEmail, updateUserPassword, addAppointment,
      cancelAppointment, updateSettings,
      updateTemplates,
      resetDatabase, markShipmentStatus, deleteShipment, nextSequence, sendWhatsAppMessage, approveAppointment 
    }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (context === undefined) throw new Error('useClinic must be used within a ClinicProvider');
  return context;
}

