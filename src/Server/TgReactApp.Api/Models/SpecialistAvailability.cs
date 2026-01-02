namespace TgReactApp.Api.Models;

public class SpecialistOffDay
{
    public Guid Id { get; set; }
    public Guid SpecialistId { get; set; }
    public DateOnly Date { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SpecialistBreak
{
    public Guid Id { get; set; }
    public Guid SpecialistId { get; set; }
    public DayOfWeek? DayOfWeek { get; set; } // null means applies to all days
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string? Description { get; set; }
    public bool IsRecurring { get; set; } // true = every week on this day, false = one-time
    public DateOnly? SpecificDate { get; set; } // For non-recurring breaks
    public DateTime CreatedAt { get; set; }
}
