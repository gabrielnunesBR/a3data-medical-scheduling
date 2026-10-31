import { useState } from 'react';

import type { Exam } from '../exams/exams.api';

import type { Doctor } from './availability.api';
import type { Appointment } from './appointments.api';

export type BookingStep = 1 | 2 | 3 | 'success';

export function useBookingFlow() {
  const [currentStep, setCurrentStep] = useState<BookingStep>(1);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [availabilityNotice, setAvailabilityNotice] = useState<string | null>(null);

  function handleExamChange(exam: Exam) {
    if (selectedExam?.id !== exam.id) {
      setSelectedDoctor(null);
      setSelectedDate(null);
      setSelectedTime(null);
    }

    setSelectedExam(exam);
    setAvailabilityNotice(null);
  }

  function handleDoctorChange(doctor: Doctor | null) {
    setSelectedDoctor(doctor);
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailabilityNotice(null);
  }

  function handleDateChange(date: string | null) {
    setSelectedDate(date);
    setSelectedTime(null);
    setAvailabilityNotice(null);
  }

  function handleTimeChange(time: string | null) {
    setSelectedTime(time);
    setAvailabilityNotice(null);
  }

  function handleConflict() {
    setSelectedTime(null);
    setAvailabilityNotice(
      'Esse horário acabou de ser reservado. Escolha outro horário disponível.',
    );
    setCurrentStep(2);
  }

  function handleBooked(appointment: Appointment) {
    setConfirmedAppointment(appointment);
    setCurrentStep('success');
  }

  function handleNewBooking() {
    setCurrentStep(1);
    setSelectedExam(null);
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setConfirmedAppointment(null);
    setAvailabilityNotice(null);
  }

  return {
    currentStep,
    setCurrentStep,
    selectedExam,
    selectedDoctor,
    selectedDate,
    selectedTime,
    confirmedAppointment,
    availabilityNotice,
    handleExamChange,
    handleDoctorChange,
    handleDateChange,
    handleTimeChange,
    handleConflict,
    handleBooked,
    handleNewBooking,
  };
}
