namespace TgReactApp.Api.Contracts;

public record CreateSpecialistRequest(
    string Name,
    string Category,
    string? Description,
    string? ImageUrl,
    decimal PricePerHour,
    int Rating
);

public record UpdateSpecialistRequest(
    string Name,
    string Category,
    string? Description,
    string? ImageUrl,
    decimal PricePerHour,
    int Rating
);

