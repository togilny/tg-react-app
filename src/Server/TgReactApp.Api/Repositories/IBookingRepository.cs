using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public interface IBookingRepository
{
    List<Booking> GetAllByUser(Guid userId);
    List<Booking> GetBySpecialist(Guid specialistId, DateTime date);
    Booking? GetById(Guid id, Guid userId);
    Booking Add(Guid userId, Guid specialistId, DateTime bookingDate, TimeSpan startTime, TimeSpan endTime, string service, string? notes);
    bool Cancel(Guid id, Guid userId);
}

public class InMemoryBookingRepository : IBookingRepository
{
    private readonly List<Booking> _bookings = new();

    public List<Booking> GetAllByUser(Guid userId) =>
        _bookings.Where(b => b.UserId == userId).OrderByDescending(b => b.BookingDate).ToList();

    public List<Booking> GetBySpecialist(Guid specialistId, DateTime date) =>
        _bookings.Where(b => b.SpecialistId == specialistId && b.BookingDate.Date == date.Date && b.Status == "Confirmed").ToList();

    public Booking? GetById(Guid id, Guid userId) =>
        _bookings.FirstOrDefault(b => b.Id == id && b.UserId == userId);

    public Booking Add(Guid userId, Guid specialistId, DateTime bookingDate, TimeSpan startTime, TimeSpan endTime, string service, string? notes)
    {
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SpecialistId = specialistId,
            BookingDate = bookingDate,
            StartTime = startTime,
            EndTime = endTime,
            Service = service,
            Notes = notes,
            Status = "Confirmed",
            CreatedAt = DateTime.UtcNow
        };

        _bookings.Add(booking);
        return booking;
    }

    public bool Cancel(Guid id, Guid userId)
    {
        var booking = GetById(id, userId);
        if (booking == null) return false;

        booking.Status = "Cancelled";
        return true;
    }
}

