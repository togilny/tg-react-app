namespace TgReactApp.Api.Contracts;

public record CreateSpecialistRequest(
    string Name,
    string Category,
    string? Description,
    string? ImageUrl,
    decimal PricePerHour,
    int Rating,
    string? Username = null,
    string? TempPassword = null
);

public record UpdateSpecialistRequest(
    string Name,
    string Category,
    string? Description,
    string? ImageUrl,
    decimal PricePerHour,
    int Rating
);

