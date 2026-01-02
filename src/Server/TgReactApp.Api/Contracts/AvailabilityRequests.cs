namespace TgReactApp.Api.Contracts;

public record CreateOffDayRequest(DateOnly Date, string? Reason);
public record UpdateOffDayRequest(DateOnly Date, string? Reason);
public record CreateBreakRequest(DayOfWeek? DayOfWeek, string StartTime, string EndTime, string? Description, bool IsRecurring, DateOnly? SpecificDate);
public record UpdateBreakRequest(DayOfWeek? DayOfWeek, string StartTime, string EndTime, string? Description, bool IsRecurring, DateOnly? SpecificDate);
public record BulkDeleteRequest(List<Guid> Ids);

public record AvailabilityResponse(
    List<OffDayDto> OffDays,
    List<BreakDto> Breaks
);

public record OffDayDto(Guid Id, DateOnly Date, string? Reason);
public record BreakDto(Guid Id, DayOfWeek? DayOfWeek, string StartTime, string EndTime, string? Description, bool IsRecurring, DateOnly? SpecificDate);
