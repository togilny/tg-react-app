using Microsoft.EntityFrameworkCore;
using TgReactApp.Api.Data;
using TgReactApp.Api.Models;

namespace TgReactApp.Api.Repositories;

public class EfBookingRepository : IBookingRepository
{
    private readonly GlowBookDbContext _context;

    public EfBookingRepository(GlowBookDbContext context)
    {
        _context = context;
    }

    public List<Booking> GetAllByUser(Guid userId) =>
        _context.Bookings
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.BookingDate)
            .ThenByDescending(b => b.StartTime)
            .ToList();

    public List<Booking> GetBySpecialist(Guid specialistId, DateTime date) =>
        _context.Bookings
            .Where(b => b.SpecialistId == specialistId 
                && b.BookingDate.Date == date.Date 
                && b.Status == "Confirmed")
            .ToList();

    public List<Booking> GetBySpecialistId(Guid specialistId) =>
        _context.Bookings
            .Where(b => b.SpecialistId == specialistId)
            .OrderByDescending(b => b.BookingDate)
            .ThenBy(b => b.StartTime)
            .ToList();

    public Booking? GetById(Guid id, Guid userId) =>
        _context.Bookings
            .FirstOrDefault(b => b.Id == id && b.UserId == userId);

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

        _context.Bookings.Add(booking);
        _context.SaveChanges();
        return booking;
    }

    public bool Cancel(Guid id, Guid userId)
    {
        var booking = GetById(id, userId);
        if (booking == null) return false;

        booking.Status = "Cancelled";
        _context.SaveChanges();
        return true;
    }
}

