import BookingItem from './BookingItem';

export default function BookingList({ bookings, specialists, onCancel }) {
  if (bookings.length === 0) {
    return (
      <div className="empty-state">
        <p>📅 No bookings yet. Browse specialists to make your first appointment!</p>
      </div>
    );
  }

  const getSpecialist = (specialistId) => {
    return specialists.find(s => s.id === specialistId);
  };

  return (
    <div className="booking-list">
      {bookings.map((booking) => (
        <BookingItem
          key={booking.id}
          booking={booking}
          specialist={getSpecialist(booking.specialistId)}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}

