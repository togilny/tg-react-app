export default function BookingItem({ booking, specialist, onCancel }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeString) => {
    // timeString is like "09:00:00"
    return timeString.substring(0, 5);
  };

  const getStatusClass = (status) => {
    return `booking-status status-${status.toLowerCase()}`;
  };

  return (
    <div className="booking-item">
      <div className="booking-header">
        <div>
          <h3>{specialist?.name || 'Specialist'}</h3>
          <span className={getStatusClass(booking.status)}>{booking.status}</span>
        </div>
        <span className="booking-date">{formatDate(booking.bookingDate)}</span>
      </div>
      
      <div className="booking-details">
        <p><strong>Time:</strong> {formatTime(booking.startTime)} - {formatTime(booking.endTime)}</p>
        <p><strong>Service:</strong> {booking.service}</p>
        {booking.notes && <p><strong>Notes:</strong> {booking.notes}</p>}
      </div>

      {booking.status === 'Confirmed' && (
        <div className="booking-actions">
          <button onClick={() => onCancel(booking.id)} className="btn-delete">
            Cancel Booking
          </button>
        </div>
      )}
    </div>
  );
}

