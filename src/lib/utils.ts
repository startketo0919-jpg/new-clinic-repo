import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { VisitType, Patient } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateToken(sequence: number): string {
  return `A-${String(sequence).padStart(3, '0')}`;
}

export function formatWaitTime(minutes: number): string {
  if (minutes < 60) return `${Math.floor(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
}

export function getExpectedDuration(visitType: VisitType): number {
  if (visitType === 'New') return 10;
  if (visitType === 'Follow-up') return 5;
  if (visitType === 'Report Review') return 2;
  return 5;
}

export function calculateWaitTime(patients: Patient[], targetIndex: number): number {
  let wait = 0;
  for (let i = 0; i < targetIndex; i++) {
    wait += getExpectedDuration(patients[i].visitType);
  }
  return wait;
}
