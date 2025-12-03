namespace TgReactApp.Api.Contracts;

public record CreateBookingRequest(
    Guid SpecialistId,
    DateTime BookingDate,
    string StartTime, // e.g. "09:00"
    string EndTime, // e.g. "10:00"
    string Service,
    string? Notes
);

