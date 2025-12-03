import { useState, useEffect } from 'react';
import { fetchBookedSlots } from '../services/bookingApi';
import { fetchServicesBySpecialist } from '../services/serviceApi';

export default function BookingModal({ specialist, onClose, onSubmit }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [notes, setNotes] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [services, setServices] = useState([]);
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
  }, [specialist.id, specialist.category]);

  useEffect(() => {
    if (selectedDate) {
      loadBookedSlots();
    }
    // Reset selected time when service or date changes
    setSelectedTime('');
  }, [selectedDate, specialist.id, selectedService]);

  const loadServices = async () => {
    try {
      // Fetch services unique to this specialist
      const data = await fetchServicesBySpecialist(specialist.id, specialist.category);
      setServices(data);
    } catch (error) {
      console.error('Error loading services:', error);
      setServices([]); // Set empty array on error
    }
  };

  const loadBookedSlots = async () => {
    try {
      const date = new Date(selectedDate);
      const slots = await fetchBookedSlots(specialist.id, date);
      setBookedSlots(slots);
    } catch (error) {
      console.error('Error loading booked slots:', error);
    }
  };

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const isTimeSlotAvailable = (time) => {
    if (!selectedService) return true; // Can't determine until service is selected
    
    const service = getSelectedServiceDetails();
    if (!service) return true;

    const slotStart = timeToMinutes(time);
    const slotEnd = slotStart + service.durationMinutes;

    // Check if this slot conflicts with any existing booking
    return !bookedSlots.some(booking => {
      const bookingStart = timeToMinutes(booking.startTime);
      const bookingEnd = timeToMinutes(booking.endTime);

      // Check for overlap
      return (slotStart < bookingEnd && slotEnd > bookingStart);
    });
  };

  const getSelectedServiceDetails = () => {
    return services.find(s => s.id === selectedService);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const service = getSelectedServiceDetails();
      const endTime = getEndTime(selectedTime, service?.durationMinutes || 60);
      
      await onSubmit({
        specialistId: specialist.id,
        bookingDate: selectedDate,
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

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={getMinDate()}
              required
            />
          </div>

          {selectedDate && selectedService && (
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
                  return (
                    <button
                      key={time}
                      type="button"
                      className={`time-slot ${selectedTime === time ? 'selected' : ''} ${!available ? 'unavailable' : ''}`}
                      onClick={() => available && setSelectedTime(time)}
                      disabled={!available}
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
              ℹ️ Please select a date to see available time slots
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
              disabled={!selectedDate || !selectedTime || !selectedService || isLoading}
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

