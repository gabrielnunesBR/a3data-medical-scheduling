import { describe, expect, it } from 'vitest';

import { createAppointmentSchema } from './create-appointment.dto.js';

describe('createAppointmentSchema', () => {
  const validAppointment = {
    patientName: 'João Silva',
    examId: 17,
    doctorId: 1,
    startAt: '2030-01-07T09:20:00-03:00',
  };

  it('should accept a valid appointment', () => {
    const result = createAppointmentSchema.safeParse(validAppointment);

    expect(result.success).toBe(true);
  });

  it('should trim the patient name', () => {
    const result = createAppointmentSchema.parse({
      ...validAppointment,
      patientName: '  João Silva  ',
    });

    expect(result.patientName).toBe('João Silva');
  });

  it.each(['', '   '])('should reject an empty patient name', (patientName) => {
    const result = createAppointmentSchema.safeParse({
      ...validAppointment,
      patientName,
    });

    expect(result.success).toBe(false);
  });

  it('should reject patient names longer than 160 characters', () => {
    const result = createAppointmentSchema.safeParse({
      ...validAppointment,
      patientName: 'A'.repeat(161),
    });

    expect(result.success).toBe(false);
  });

  it.each([0, -1, 1.5, '17', 2147483648])('should reject invalid exam IDs: %s', (examId) => {
    const result = createAppointmentSchema.safeParse({
      ...validAppointment,
      examId,
    });

    expect(result.success).toBe(false);
  });

  it.each([0, -1, 2.5, '1', 2147483648])('should reject invalid doctor IDs: %s', (doctorId) => {
    const result = createAppointmentSchema.safeParse({
      ...validAppointment,
      doctorId,
    });

    expect(result.success).toBe(false);
  });

  it('should accept a UTC timestamp', () => {
    const result = createAppointmentSchema.safeParse({
      ...validAppointment,
      startAt: '2030-01-07T12:20:00Z',
    });

    expect(result.success).toBe(true);
  });

  it('should reject timestamps without a timezone', () => {
    const result = createAppointmentSchema.safeParse({
      ...validAppointment,
      startAt: '2030-01-07T09:20:00',
    });

    expect(result.success).toBe(false);
  });

  it('should reject malformed timestamps', () => {
    const result = createAppointmentSchema.safeParse({
      ...validAppointment,
      startAt: 'invalid-date',
    });

    expect(result.success).toBe(false);
  });

  it('should reject unexpected fields', () => {
    const result = createAppointmentSchema.safeParse({
      ...validAppointment,
      endAt: '2030-01-07T10:00:00-03:00',
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = createAppointmentSchema.safeParse({
      patientName: 'João Silva',
      examId: 17,
    });

    expect(result.success).toBe(false);
  });
});
