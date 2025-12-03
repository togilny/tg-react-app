namespace TgReactApp.Api.Models;

public class Booking
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid SpecialistId { get; set; }
    public DateTime BookingDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public required string Service { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "Confirmed"; // Confirmed, Cancelled, Completed
    public DateTime CreatedAt { get; set; }
}

