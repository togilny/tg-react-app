import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { fetchBookedSlots } from '../services/bookingApi';
import { fetchServicesBySpecialist } from '../services/serviceApi';
import { fetchSpecialistAvailability } from '../services/specialistApi';

export default function BookingModal({ specialist, onClose, onSubmit }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [notes, setNotes] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [services, setServices] = useState([]);
  const [availability, setAvailability] = useState({ offDays: [], breaks: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Generate 15-minute time slots from 9:00 AM to 6:00 PM
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    loadServices();
    loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialist.id]);

  useEffect(() => {
    if (selectedDate) {
      loadBookedSlots();
    }
    // Reset selected time when service or date changes
    setSelectedTime('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, specialist.id, selectedService]);

  const loadServices = async () => {
    try {
      const data = await fetchServicesBySpecialist(specialist.id, specialist.category);
      setServices(data);
    } catch (error) {
      console.error('Error loading services:', error);
      setServices([]);
    }
  };

  const loadAvailability = async () => {
    try {
      const data = await fetchSpecialistAvailability(specialist.id);
      setAvailability(data);
    } catch (error) {
      console.error('Error loading availability:', error);
      setAvailability({ offDays: [], breaks: [] });
    }
  };

  const loadBookedSlots = async () => {
    try {
      const slots = await fetchBookedSlots(specialist.id, selectedDate);
      setBookedSlots(slots);
    } catch (error) {
      console.error('Error loading booked slots:', error);
    }
  };

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Check if a date is an off day
  const isOffDay = (date) => {
    const dateStr = formatDateForApi(date);
    return availability.offDays.some(od => od.date === dateStr);
  };

  // Check if a time slot is during a break
  const isDuringBreak = (time, date) => {
    const slotStart = timeToMinutes(time);
    const dayOfWeek = date.getDay();
    const dateStr = formatDateForApi(date);

    return availability.breaks.some(brk => {
      // Check if break applies to this date
      const appliesToThisDay = 
        (brk.isRecurring && (brk.dayOfWeek === null || brk.dayOfWeek === dayOfWeek)) ||
        (!brk.isRecurring && brk.specificDate === dateStr);

      if (!appliesToThisDay) return false;

      const breakStart = timeToMinutes(brk.startTime);
      const breakEnd = timeToMinutes(brk.endTime);

      // Check if slot overlaps with break
      const service = getSelectedServiceDetails();
      const slotEnd = slotStart + (service?.durationMinutes || 15);
      
      return (slotStart < breakEnd && slotEnd > breakStart);
    });
  };

  const isTimeSlotAvailable = (time) => {
    if (!selectedService || !selectedDate) return true;
    
    const service = getSelectedServiceDetails();
    if (!service) return true;

    // Check if during break
    if (isDuringBreak(time, selectedDate)) return false;

    const slotStart = timeToMinutes(time);
    const slotEnd = slotStart + service.durationMinutes;

    // Check if this slot conflicts with any existing booking
    return !bookedSlots.some(booking => {
      const bookingStart = timeToMinutes(booking.startTime);
      const bookingEnd = timeToMinutes(booking.endTime);
      return (slotStart < bookingEnd && slotEnd > bookingStart);
    });
  };

  const getSelectedServiceDetails = () => {
    return services.find(s => s.id === selectedService);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const service = getSelectedServiceDetails();
      const endTime = getEndTime(selectedTime, service?.durationMinutes || 60);
      const bookingDate = formatDateForApi(selectedDate);
      
      await onSubmit({
        specialistId: specialist.id,
        bookingDate: bookingDate,
        startTime: selectedTime,
        endTime: endTime,
        service: service?.name || 'General Service',
        notes
      });
      onClose();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getEndTime = (startTime, durationMinutes) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  };

  const formatDateForApi = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (date) => {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Calendar tile class name for styling off days
  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    
    const classes = [];
    
    // Check if it's an off day
    if (isOffDay(date)) {
      classes.push('off-day');
    }
    
    // Check if it's in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      classes.push('past-day');
    }
    
    return classes.join(' ');
  };

  // Disable off days and past dates
  const tileDisabled = ({ date, view }) => {
    if (view !== 'month') return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return date < today || isOffDay(date);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content booking-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Book {specialist.name}</h2>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-group">
            <label>Service *</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              required
            >
              <option value="">Select a service...</option>
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name} - {svc.durationMinutes} min - £{svc.price}
                </option>
              ))}
            </select>
            {getSelectedServiceDetails() && (
              <p className="service-hint">
                📝 {getSelectedServiceDetails().description}
              </p>
            )}
          </div>

          <div className="form-group">
            <label>Date *</label>
            <div className="calendar-container">
              <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                minDate={new Date()}
                tileClassName={tileClassName}
                tileDisabled={tileDisabled}
                locale="en-GB"
                calendarType="iso8601"
              />
            </div>
            {selectedDate && (
              <p className="selected-date-display">
                📅 Selected: {formatDateDisplay(selectedDate)}
                {isOffDay(selectedDate) && <span className="off-day-warning"> (Unavailable - Off Day)</span>}
              </p>
            )}
          </div>

          {selectedDate && selectedService && !isOffDay(selectedDate) && (
            <div className="form-group">
              <label>Time Slot (15-min intervals) *</label>
              {getSelectedServiceDetails() && (
                <p className="slot-info">
                  ⏱️ Selected service duration: {getSelectedServiceDetails().durationMinutes} minutes
                </p>
              )}
              <div className="time-slots">
                {timeSlots.map((time) => {
                  const available = isTimeSlotAvailable(time);
                  const onBreak = isDuringBreak(time, selectedDate);
                  return (
                    <button
                      key={time}
                      type="button"
                      className={`time-slot ${selectedTime === time ? 'selected' : ''} ${!available ? 'unavailable' : ''} ${onBreak ? 'on-break' : ''}`}
                      onClick={() => available && setSelectedTime(time)}
                      disabled={!available}
                      title={onBreak ? 'Break time' : !available ? 'Booked' : ''}
                    >
                      {time}
                      {!available && <span className="slot-status">✕</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedDate && !selectedService && (
            <div className="info-message">
              ℹ️ Please select a service first to see available time slots
            </div>
          )}

          {!selectedDate && selectedService && (
            <div className="info-message">
              ℹ️ Please select a date from the calendar to see available time slots
            </div>
          )}

          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests..."
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!selectedDate || !selectedTime || !selectedService || isLoading || isOffDay(selectedDate)}
              className="btn-confirm"
            >
              {isLoading ? 'Booking...' : `Confirm - £${getSelectedServiceDetails()?.price || 0}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

