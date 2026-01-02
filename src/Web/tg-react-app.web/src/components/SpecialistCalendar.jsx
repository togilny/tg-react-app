import { useState, useEffect } from 'react';
import { fetchMyAppointments } from '../services/specialistApi';

export default function SpecialistCalendar() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'confirmed', 'cancelled'

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setIsLoading(true);
    setError('');
    try {
      console.log('Fetching appointments...');
      const data = await fetchMyAppointments();
      console.log('Appointments received:', data);
      setAppointments(data || []);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const groupByDate = (bookings) => {
    const filtered = bookings.filter(b => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'confirmed') return b.status === 'Confirmed';
      if (filterStatus === 'cancelled') return b.status === 'Cancelled';
      return true;
    });

    const groups = {};
    filtered.forEach(booking => {
      const dateKey = new Date(booking.bookingDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: new Date(booking.bookingDate),
          appointments: []
        };
      }
      
      groups[dateKey].appointments.push(booking);
    });

    // Sort appointments within each day by start time
    Object.values(groups).forEach(group => {
      group.appointments.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return Object.entries(groups).sort(([, a], [, b]) => a.date - b.date);
  };

  const formatTime = (timeString) => {
    // Handle TimeSpan format like "14:30:00.0000000"
    const parts = timeString.split(':');
    const hour = parseInt(parts[0]);
    const minute = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      Confirmed: 'background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3)',
      Cancelled: 'background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3)',
      Completed: 'background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3)'
    };

    return (
      <span style={{
        ...styles[status],
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.85rem',
        fontWeight: '500'
      }}>
        {status}
      </span>
    );
  };

  const getTodayIndicator = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    if (checkDate.getTime() === today.getTime()) {
      return <span style={{ 
        marginLeft: '12px', 
        padding: '4px 12px', 
        background: 'rgba(59, 130, 246, 0.2)', 
        color: '#3b82f6',
        borderRadius: '12px',
        fontSize: '0.85rem',
        fontWeight: '600'
      }}>Today</span>;
    }
    return null;
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.6)' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem' }}>Loading your appointments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '1.5rem', 
        background: 'rgba(239, 68, 68, 0.1)', 
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '8px',
        color: '#ef4444'
      }}>
        ⚠️ {error}
      </div>
    );
  }

  const groupedAppointments = groupByDate(appointments);
  const totalConfirmed = appointments.filter(a => a.status === 'Confirmed').length;
  const totalCancelled = appointments.filter(a => a.status === 'Cancelled').length;

  return (
    <div className="specialist-calendar">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '600' }}>📅 My Appointments</h2>
          <p style={{ margin: '0.5rem 0 0 0', color: 'rgba(255,255,255,0.6)' }}>
            {appointments.length} total appointment{appointments.length !== 1 ? 's' : ''} 
            ({totalConfirmed} confirmed, {totalCancelled} cancelled)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setFilterStatus('all')}
            style={{
              padding: '0.65rem 1.5rem',
              background: 'transparent',
              border: `2px solid ${filterStatus === 'all' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.4)'}`,
              borderRadius: '8px',
              color: filterStatus === 'all' ? '#3b82f6' : 'rgba(59, 130, 246, 0.7)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('confirmed')}
            style={{
              padding: '0.65rem 1.5rem',
              background: 'transparent',
              border: `2px solid ${filterStatus === 'confirmed' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(34, 197, 94, 0.4)'}`,
              borderRadius: '8px',
              color: filterStatus === 'confirmed' ? '#22c55e' : 'rgba(34, 197, 94, 0.7)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            Confirmed
          </button>
          <button
            onClick={() => setFilterStatus('cancelled')}
            style={{
              padding: '0.65rem 1.5rem',
              background: 'transparent',
              border: `2px solid ${filterStatus === 'cancelled' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.4)'}`,
              borderRadius: '8px',
              color: filterStatus === 'cancelled' ? '#ef4444' : 'rgba(239, 68, 68, 0.7)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            Cancelled
          </button>
        </div>
      </div>

      {groupedAppointments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No appointments {filterStatus !== 'all' ? `(${filterStatus})` : ''}</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>
            {filterStatus === 'all' 
              ? 'Your calendar is clear! Appointments will appear here once customers book with you.'
              : `No ${filterStatus} appointments to display.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {groupedAppointments.map(([dateKey, { date, appointments: dayAppointments }]) => (
            <div 
              key={dateKey}
              style={{
                background: isPastDate(date) ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                opacity: isPastDate(date) ? 0.7 : 1
              }}
            >
              <h3 style={{ 
                margin: '0 0 1.5rem 0', 
                fontSize: '1.25rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center'
              }}>
                {dateKey}
                {getTodayIndicator(date)}
                {isPastDate(date) && (
                  <span style={{ 
                    marginLeft: '12px', 
                    fontSize: '0.85rem', 
                    color: 'rgba(255,255,255,0.4)',
                    fontWeight: 'normal'
                  }}>
                    (Past)
                  </span>
                )}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {dayAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <div style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '600',
                        marginBottom: '0.5rem',
                        color: 'white'
                      }}>
                        {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                      </div>
                      <div style={{ 
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '0.95rem',
                        marginBottom: '0.25rem'
                      }}>
                        🎯 {appointment.service}
                      </div>
                      {appointment.notes && (
                        <div style={{ 
                          color: 'rgba(255,255,255,0.5)',
                          fontSize: '0.85rem',
                          fontStyle: 'italic',
                          marginTop: '0.5rem'
                        }}>
                          💬 {appointment.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {getStatusBadge(appointment.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
