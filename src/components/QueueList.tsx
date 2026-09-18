import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { Patient, PatientStatus } from '../types';
import { formatWaitTime, cn } from '../lib/utils';
import { getLocalTodayString, isSameDayLocal } from '../lib/dateUtils';
import { RefreshCcw, GripVertical, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function QueueList() {
  const { state, updatePatientStatus, reorderWaitingQueue } = useClinic();
  
  const todayStr = getLocalTodayString();
  const todaysPatients = state.patients.filter(p => isSameDayLocal(p.checkInTime, todayStr));

  const waitingPatients = todaysPatients.filter(p => p.status === 'Waiting');
  const skippedPatients = todaysPatients.filter(p => p.status === 'Skipped');
  const completedPatients = todaysPatients.filter(p => p.status === 'Completed').sort((a, b) => (b.completedTime || 0) - (a.completedTime || 0));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = waitingPatients.findIndex((p) => p.id === active.id);
      const newIndex = waitingPatients.findIndex((p) => p.id === over.id);
      
      const newOrder = arrayMove(waitingPatients, oldIndex, newIndex);
      reorderWaitingQueue(newOrder);
    }
  };

  const movePatient = (id: string, direction: 'up' | 'down') => {
    const currentIndex = waitingPatients.findIndex((p) => p.id === id);
    if (currentIndex === -1) return;
    
    if (direction === 'up' && currentIndex > 0) {
      const newOrder = arrayMove(waitingPatients, currentIndex, currentIndex - 1);
      reorderWaitingQueue(newOrder);
    } else if (direction === 'down' && currentIndex < waitingPatients.length - 1) {
      const newOrder = arrayMove(waitingPatients, currentIndex, currentIndex + 1);
      reorderWaitingQueue(newOrder);
    }
  };

  const handleRecall = (id: string) => {
    updatePatientStatus(id, 'Waiting');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
      
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Active Queue</h3>
        <span className="bg-slate-200 text-slate-700 text-xs px-2 py-1 rounded-full font-medium">
          {waitingPatients.length} Waiting
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={waitingPatients.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2 p-2">
              {waitingPatients.length === 0 && (
                <div className="text-center text-slate-400 py-8">No patients waiting</div>
              )}
              {waitingPatients.map((patient, index) => (
                <SortableItem 
                  key={patient.id} 
                  patient={patient} 
                  onMoveUp={index > 0 ? () => movePatient(patient.id, 'up') : undefined}
                  onMoveDown={index < waitingPatients.length - 1 ? () => movePatient(patient.id, 'down') : undefined}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {skippedPatients.length > 0 && (
          <div className="mt-6 px-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Skipped / No-Show</h4>
            <div className="flex flex-col gap-2">
              {skippedPatients.map(patient => (
                <div key={patient.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 opacity-75 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm">
                      {patient.token.split('-')[1]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">{patient.fullName}</p>
                      <p className="text-xs text-slate-500">{patient.phone}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRecall(patient.id)}
                    className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Recall
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {completedPatients.length > 0 && (
          <div className="mt-6 px-4 pb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recently Completed</h4>
            <div className="flex flex-col gap-2">
              {completedPatients.slice(0, 5).map((patient: any) => (
                <CompletedPatientRow key={patient.id} patient={patient} />
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function SortableItem({ patient, onMoveUp, onMoveDown }: { patient: Patient; key?: React.Key; onMoveUp?: () => void; onMoveDown?: () => void; }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: patient.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-3 rounded-xl border bg-white transition-shadow",
        isDragging ? "shadow-lg border-teal-300 ring-1 ring-teal-200" : "border-slate-200 shadow-sm hover:border-slate-300",
        patient.priority === 'Emergency' && !isDragging && "border-l-4 border-l-rose-500",
        patient.priority === 'Senior Citizen' && !isDragging && "border-l-4 border-l-amber-500"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-1 bg-slate-50 p-1 rounded-md">
          <button 
            onClick={onMoveUp}
            disabled={!onMoveUp}
            className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <div 
            {...attributes} 
            {...listeners}
            className="cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing p-1"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <button 
            onClick={onMoveDown}
            disabled={!onMoveDown}
            className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base border",
          patient.priority === 'Emergency' ? 'bg-rose-50 text-rose-700 border-rose-100' :
          patient.priority === 'Senior Citizen' ? 'bg-amber-50 text-amber-700 border-amber-100' :
          'bg-slate-50 text-slate-700 border-slate-100'
        )}>
          {patient.token.split('-')[1]}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-800 text-sm">{patient.fullName}</h4>
            {patient.priority !== 'Normal' && (
              <span className={cn(
                "text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded",
                patient.priority === 'Emergency' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
              )}>
                {patient.priority}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
            <span>{patient.phone}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatWaitTime(Math.max(0, Math.floor((Date.now() - patient.checkInTime) / 60000)))}
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-right flex flex-col items-end justify-center">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{patient.visitType}</span>
        {patient.shiftPreference && (
          <span className={cn(
            "text-[10px] uppercase font-bold mt-1 px-1.5 py-0.5 rounded",
            patient.shiftPreference === 'Morning' ? "bg-sky-100 text-sky-700" : "bg-indigo-100 text-indigo-700"
          )}>
            {patient.shiftPreference}
          </span>
        )}
      </div>
    </div>
  );
}

const CompletedPatientRow: React.FC<{ patient: any }> = ({ patient }) => {
  const { state, updateFollowUpDate } = useClinic();
  const [followUpDays, setFollowUpDays] = useState<string>("");
  const [customDays, setCustomDays] = useState<string>("");

  const registryRecord = state.patientRegistry.find(r => r.clinicId === patient.clinicId);
  const currentFollowUp = registryRecord?.followUpDate;

  const handleFollowUpChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFollowUpDays(val);
    
    if (val !== "custom" && val !== "") {
      const days = parseInt(val, 10);
      if (!isNaN(days)) {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + days);
        updateFollowUpDate(patient.clinicId, newDate.getTime());
      }
    }
  };

  const handleCustomDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomDays(val);
    const days = parseInt(val, 10);
    if (!isNaN(days) && days > 0) {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + days);
      updateFollowUpDate(patient.clinicId, newDate.getTime());
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-emerald-100 bg-emerald-50/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
            {patient.token.split('-')[1]}
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-sm">{patient.fullName}</p>
            <p className="text-xs text-slate-500">
              Completed at {new Date(patient.completedTime || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
        </div>
        
        {currentFollowUp && (
          <div className="text-right">
            <p className="text-xs font-semibold text-emerald-700">Follow-up Set:</p>
            <p className="text-[10px] text-emerald-600">{new Date(currentFollowUp).toLocaleDateString()}</p>
          </div>
        )}
      </div>
      
      <div className="mt-2 pt-2 border-t border-emerald-100/50 flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="text-xs font-medium text-emerald-800 shrink-0">Medicines given for:</label>
        <div className="flex items-center gap-2 flex-1">
          <select 
            value={followUpDays}
            onChange={handleFollowUpChange}
            className="text-xs py-1 px-2 border border-emerald-200 rounded-md bg-white text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
          >
            <option value="">Select duration...</option>
            <option value="3">3 Days</option>
            <option value="5">5 Days</option>
            <option value="7">7 Days</option>
            <option value="15">15 Days</option>
            <option value="30">1 Month</option>
            <option value="custom">Custom...</option>
          </select>
          
          {followUpDays === 'custom' && (
            <input 
              type="number" 
              min="1"
              value={customDays}
              onChange={handleCustomDaysChange}
              placeholder="Days"
              className="w-16 text-xs py-1 px-2 border border-emerald-200 rounded-md bg-white text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          )}
        </div>
      </div>
    </div>
  );
}
